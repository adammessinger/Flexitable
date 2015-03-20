/**
 Flexitable jQuery plugin
 Copyright (c) 2015 Adam Messinger, http://zenscope.com/
 Released under the MIT license, see LICENSE file for details.

 This plugin owes its starting point to the work of Marco Pegoraro (movableapp.com):
   https://github.com/marcopeg/MediaTable
 ...and also borrows some ideas from Tablesaw by Filament Group:
   https://github.com/filamentgroup/tablesaw

 TODO: Drop column toggle menu into page above table first. If user clicks menu button before init is complete, the drop-down will display a progress meter until this is hidden and checkbox list populated.

 TODO: Init column toggling only once column button is clicked? Shouldn't make much difference for small tables, and would save needless high processor usage on large tables.

 TODO: "refresh" method to re-init cells and view_model without rebuilding and re-placing toggle menu. Useful for tables that have been rebuilt due to some ajax operation.

 TODO: Dim table w/ opacity change while toggling? Would give visual feedback during slow toggle (> ~200ms) on large tables, and it's a relatively inexpensive style change in terms of rendering impact.

 TODO: "disable" method to render plugin non-functional without undoing it completely? Appears to be as simple as setting button's "disabled" property to true.

 TODO: table search/filter, if it can be made fast enough
 **/

;(function($, undefined) {
  'use strict';

  $.fn.flexitable = function(user_config) {
    return this.each(function(i) {
      var $table = $(this);
      var config = $.extend({
        column_toggle: true,
        has_column_menu: true,
        column_button_txt: 'Columns:',
        // NOTE: takes a CSS selector; 'this' means position relative to the enhanced table
        toolbar_position_target: 'this',
        toolbar_before_or_after: 'before',
        destroy: false
      }, (user_config || {}));

      if (config.destroy) {
        ColumnChooser($table, config, i).destroy();
      } else if (config.column_toggle) {
        ColumnChooser($table, config, i).init();
      }
    });
  };


  function ColumnChooser($table, config, i) {
    // view_model will contain all the data we need for future DOM manipulations.
    // Much faster than revisiting the DOM repeatedly.
    var view_model = {
      id: $table[0].id,
      // cfg: this table's Flexitable config
      cfg: config,
      $table: $table,
      $toolbar: $('<div class="flexitable-toolbar" />'),
      // $menu: will hold column toggle menu
      $menu: null,
      // cells_by_column: array of objects w/ each col's header txt & th,
      // contained cells, and visibility & persistence states
      cells_by_column: []
    };

    // public methods
    return {
      init: initFlexitable,
      destroy: destroyFlexitable
    };


    function initFlexitable() {
      var $headers;

      // Prevent re-initialization
      if (view_model.$table.data('Flexitable')) {
        return;
      }

      // Set table ID if not specified
      if (!view_model.id) {
        view_model.id = 'flexitable-' + i;
        view_model.$table[0].id = view_model.id;
      }

      $headers = view_model.$table.find('> thead th');
      if ($headers.length) {
        // NOTE: "deferredEach" plugin is tacked onto the very bottom of this file
        $.deferredEach($headers, _initCellsByHeader)
          .done(function() {
            // 'flexitable-active' class enables media queries, once above init gives
            // proper classes to cells
            view_model.$table.addClass('flexitable-active');

            // NOTE: MUST build menu after _initCellsByHeader, not before
            if (view_model.cfg.has_column_menu && view_model.cells_by_column.length) {
              _buildMenu();
              _initMenuInteractions();
              _insertMenu();
            }

            view_model.$table.data('Flexitable', view_model);

            view_model.$table.trigger('flexitable.initialized');
          });
      }
    }


    function destroyFlexitable() {
      var flexitable_data = view_model.$table.data('Flexitable');

      if (!flexitable_data) {
        return;
      }

      flexitable_data.$menu.remove();
      flexitable_data.$toolbar.remove();
      // remove active class to nix Flexitable media queries
      view_model.$table.removeClass('flexitable-active');
      // remove stored plugin data on the table
      view_model.$table.removeData('Flexitable');
    }


    function _initCellsByHeader(index, header) {
      var $header = $(header);
      var priority_class = $header.data('flexitablePriorityClass');
      // NOTE: cell_num is used for nth-child selectors, which aren't 0-indexed
      var cell_num = index + 1;
      var $col_cells = view_model.$table.find('> thead th:nth-child(' + cell_num + '), > tbody td:nth-child(' + cell_num + ')');
      // cell loop vars:
      var i, l;

      for (i = 0, l = $col_cells.length; i < l; i++) {
        if (priority_class) {
          $col_cells[i].className += (' ' + priority_class);
        }
      }

      view_model.cells_by_column[index] = {
        // NOTE: we're using the th's visibility as a proxy for the column's
        is_visible: ($header.css('display') === 'table-cell'),
        $th: $header,
        heading_text: $header.text(),
        is_persistent_col: $header.hasClass('persist'),
        $cells: $col_cells
      };
    }


    // debounce: from https://github.com/twitter/typeahead.js & http://davidwalsh.name/function-debounce
    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds. If 'immediate' is passed, trigger the function on the
    // leading edge instead of the trailing.
    function _debounce(func, wait, immediate) {
      var timeout;
      var result;

      return function() {
        var context = this;
        var args = arguments;
        var later = function() {
          timeout = null;
          if (!immediate) {
            result = func.apply(context, args);
          }
        };
        var callNow = immediate && !timeout;

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) {
          result = func.apply(context, args);
        }
        return result;
      };
    }


    function _buildMenu() {
      var cells_by_column = view_model.cells_by_column;
      var checkbox_id_pfx = (view_model.id + '_toggle-col-');
      var li_cache = [];
      var i, l, $this_checkbox, $this_label;

      // Build menu containers
      view_model.$menu = $('<div class="flexitable-menu flexitable-menu-closed" />');
      view_model.$menu.$button = $('<button type="button" />').text(view_model.cfg.column_button_txt);
      view_model.$menu.$list = $('<ul />');
      view_model.$menu
        .append(view_model.$menu.$button)
        .append(view_model.$menu.$list);

      // populate menu with checkboxes for each non-persistent column
      for (i = 0, l = cells_by_column.length; i < l; i++) {
        if (!cells_by_column[i].is_persistent_col) {
          $this_checkbox = $('<input />', {
            type: 'checkbox',
            name: 'toggle-cols',
            id: (checkbox_id_pfx + i),
            value: i,
            'data-flexitable-id': view_model.id
          });
          $this_checkbox.prop('checked', cells_by_column[i].is_visible);

          $this_label = $('<label />', {
            for: (checkbox_id_pfx + i),
            text: cells_by_column[i].heading_text
          });

          li_cache.push($('<li />').append($this_checkbox).append($this_label))
        }
      }

      view_model.$menu.$list.append(li_cache);
    }


    function _insertMenu() {
      var placement_target = view_model.cfg.toolbar_position_target === 'this'
        ? view_model.$table
        : $(view_model.cfg.toolbar_position_target);
      var placement_method = view_model.cfg.toolbar_before_or_after.toLowerCase() === 'after'
        ? 'insertAfter'
        : 'insertBefore';

      view_model.$toolbar
        .append(view_model.$menu)
        // Add a class to the toolbar to inform about menu presence.
        .addClass('flexitable-toolbar-has-widgets')
        [placement_method](placement_target);
    }


    function _initMenuInteractions() {
      view_model.$menu
        .on('click', 'button', _toggleMenuVisibility)
        .on('change', 'input[name="toggle-cols"]', _toggleColumn)
        .on('updateCheck', 'input[name="toggle-cols"]', _updateMenuCheckbox);

      // Update checkbox status on viewport changes.
      $(window).on('orientationchange resize', _debounce(_updateCheckboxesOnViewportChange, 500));

      // Close menu when user clicks anywhere outside the menu.
      $(document).on('click', _closeMenuOnOutsideClick);
    }


    function _toggleMenuVisibility() {
      view_model.$menu.toggleClass('flexitable-menu-closed');
    }


    function _closeMenuOnOutsideClick(event) {
      if (!view_model.$menu.find(event.target).length) {
        view_model.$menu.addClass('flexitable-menu-closed');
      }
    }


    function _toggleColumn(event) {
      var checkbox = event.target;
      // NOTE: checkbox value is the same as column index from view_model.cells_by_column
      var i_col = parseInt(checkbox.value, 10);

      view_model.cells_by_column[i_col].$cells
        .toggleClass('flexitable-cell-shown', checkbox.checked)
        .toggleClass('flexitable-cell-hidden', !checkbox.checked);

      // update active state in view_model
      view_model.cells_by_column[i_col].is_visible = checkbox.checked;
    }


    function _updateMenuCheckbox(event) {
      var checkbox = event.target;
      // NOTE: checkbox value is the same as column index from view_model.cells_by_column
      var i_col = parseInt(checkbox.value, 10);

      checkbox.checked = view_model.cells_by_column[i_col].is_visible;
    }


    function _updateCheckboxesOnViewportChange() {
      var i, l, cells_by_column = view_model.cells_by_column;

      // update active state of columns
      for (i = 0, l = cells_by_column.length; i < l; i++) {
        cells_by_column[i].is_visible = (cells_by_column[i].$th.css('display') === 'table-cell');
      }
      // update all checkboxes
      view_model.$menu.$list.find('input').trigger('updateCheck');
    }
  }
})(jQuery);


/* jQuery.deferredEach docs and info:
 * https://github.com/adammessinger/jQuery.deferredEach */
(function($, undefined) {
  'use strict';

  $.deferredEach = function(collection, callback) {
    var i = 0;
    var length = collection.length;
    var is_array = _isArraylike(collection);
    var parent_deferred = new $.Deferred();
    var child_deferreds;
    var keys = [];
    var next, key;

    if (is_array) {
      child_deferreds = _makeChildDeferredsArray(length);

      next = function() {
        if (i < length && callback.call(collection[i], i, collection[i++]) !== false) {
          setTimeout(next, 1);
        }
        child_deferreds[i - 1].resolve();
        parent_deferred.notify(i / length);
      };
      next();
    } else {
      for (key in collection) {
        keys.push(key);
      }
      child_deferreds = _makeChildDeferredsArray(keys.length);

      next = function() {
        if (i < keys.length && callback.call(collection[keys[i]], keys[i], collection[keys[i++]]) !== false) {
          setTimeout(next, 1);
        }
        child_deferreds[i - 1].resolve();
        parent_deferred.notify(i / keys.length);
      };
      next();
    }

    $.when.apply(undefined, child_deferreds).then(function() {
      parent_deferred.notify(1);
      parent_deferred.resolve(collection);
    });
    return parent_deferred.promise();
  };

  function _makeChildDeferredsArray(length) {
    var i = 0;
    var array = [];

    for (; i < length; i++) {
      array.push(new $.Deferred());
    }
    return array;
  }

  function _isArraylike(obj) {
    var length = obj.length;
    var type = $.type(obj);

    if (type === "function" || $.isWindow(obj)) {
      return false;
    }
    if (obj.nodeType === 1 && length) {
      return true;
    }
    return type === "array" || length === 0 ||
           (typeof length === "number" && length > 0 && (length - 1) in obj);
  }
})(jQuery);