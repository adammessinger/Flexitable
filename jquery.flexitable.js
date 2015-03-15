/**
 Flexitable jQuery plugin
 Copyright (c) 2015 Adam Messinger, http://zenscope.com/
 Released under the MIT license, see LICENSE file for details.

 This plugin owes its starting point to the work of Marco Pegoraro (movableapp.com):
   https://github.com/marcopeg/MediaTable
 ...and also borrows some ideas from Tablesaw by Filament Group:
   https://github.com/filamentgroup/tablesaw
 **/

;(function($, undefined) {
  'use strict';

  $.fn.flexitable = function(user_config) {
    return this.each(function(i) {
      var $table = $(this);
      var config = $.extend({
        has_menu: true,
        button_title: 'Columns:',
        destroy: false
      }, (user_config || {}));
      var flexitable = columnChooser($table, config, i);

      if (config.destroy) {
        flexitable.destroy();
      } else {
        flexitable.init();
      }
    });
  };


  /* "deferredEach" based on "yieldingEach" by Colin Marc (http://colinmarc.com/)
   * and the source for jQuery.each() */
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


  function columnChooser($table, config, i) {
    var persistent_css_class = 'persist';
    var essential_css_class = 'essential';
    var optional_css_class = 'optional';
    // view_model will contain all the data we need for future DOM manipulations.
    // Much faster than revisiting the DOM repeatedly.
    var view_model = {
      id: $table[0].id,
      // cfg: this table's Flexitable config
      cfg: config,
      $table: $table,
      $wrapper: $('<div class="flexitable-wrapper" />'),
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
      // Prevent re-initialization
      if (view_model.$table.data('Flexitable')) {
        return;
      }

      // Set table ID if not specified
      if (!view_model.id) {
        view_model.id = 'flexitable-' + i;
        view_model.$table[0].id = view_model.id;
      }

      _initCellsByHeader(view_model);

      // 'flexitable-active' class enables media queries, once above init gives
      // proper classes to cells
      view_model.$table
        .addClass('flexitable-active')
        .before(view_model.$wrapper);

      // NOTE: using standard .appendChild() here because it saves 500-700ms in
      // IE 11 vs. jQ .appendTo()
      view_model.$wrapper[0].appendChild(view_model.$table[0]);

      // NOTE: MUST build menu after _initCellsByHeader, not before
      if (view_model.cfg.has_menu && view_model.cells_by_column) {
        _buildMenu(view_model);
      }

      view_model.$table.data('Flexitable', {
        $menu: view_model.$menu,
        $wrapper: view_model.$wrapper
      });
    }


    function destroyFlexitable() {
      var flexitable_data = view_model.$table.data('Flexitable');

      if (!flexitable_data) {
        return;
      }

      flexitable_data.$menu.remove();
      flexitable_data.$wrapper.after(view_model.$table).remove();
      // remove active class to nix Flexitable media queries
      view_model.$table.removeClass('flexitable-active');
      // remove stored plugin data on the table
      view_model.$table.removeData('Flexitable');
    }


    function _initCellsByHeader() {
      var $headers = view_model.$table.find('thead th');
      var cells_by_column = view_model.cells_by_column;
      // the remaining are loop vars:
      var is_optional_col, is_essential_col, is_persistent_col;
      var cell_num, $this_header, $col_cells;
      var i_headers, l_headers, i_cells, l_cells;

      if (!$headers.length) {
        if (window.console && console.warn) {
          console.warn('No headers in table#' + view_model.id);
        }
        return;
      }

      for (i_headers = 0, l_headers = $headers.length; i_headers < l_headers; i_headers++) {
        $this_header = $headers.eq(i_headers);
        is_persistent_col = $this_header.hasClass(persistent_css_class);
        is_essential_col = $this_header.hasClass(essential_css_class);
        is_optional_col = $this_header.hasClass(optional_css_class);
        // NOTE: cell_num is used for nth-child selectors, which aren't 0-indexed
        cell_num = i_headers + 1;
        $col_cells = view_model.$table.find('thead th:nth-child(' + cell_num + '), tbody td:nth-child(' + cell_num + ')');

        // NOTE: using a loop here saved init time for huge tables vs. .toggleClass()
        for (i_cells = 0, l_cells = $col_cells.length; i_cells < l_cells; i_cells++) {
          $col_cells[i_cells].className += is_essential_col
            ? (' ' + essential_css_class)
            : '';
          $col_cells[i_cells].className += is_optional_col
            ? (' ' + optional_css_class)
            : '';
        }

        cells_by_column.push({
          // NOTE: we're using the th's visibility as a proxy for the column's
          is_visible: ($this_header.css('display') === 'table-cell'),
          $th: $this_header,
          heading_text: $this_header.text(),
          is_persistent_col: is_persistent_col,
          // NOTE: no need to store cells for persistent columns, so we don't to save memory
          $cells: is_persistent_col ? null : $col_cells
        });
      }
    }


    function _buildMenu() {
      var cells_by_column = view_model.cells_by_column;
      var li_cache = [];
      var i, l, $this_checkbox, $this_label;

      // Build menu containers
      view_model.$menu = $('<div class="flexitable-menu flexitable-menu-closed" />');
      view_model.$menu.$button = $('<button type="button" />').text(view_model.cfg.button_title);
      view_model.$menu.$list = $('<ul />');
      view_model.$menu
        .append(view_model.$menu.$button)
        .append(view_model.$menu.$list);

      // Add a class to the wrapper to inform about menu presence.
      view_model.$wrapper.addClass('flexitable-has-menu');

      // populate menu with checkboxes for each non-persistent column
      for (i = 0, l = cells_by_column.length; i < l; i++) {
        if (!cells_by_column[i].is_persistent_col) {
          $this_checkbox = $('<input />', {
            type: 'checkbox',
            name: 'toggle-cols',
            id: 'toggle-col-'+i,
            value: i
          });
          $this_checkbox.prop('checked', cells_by_column[i].is_visible);

          $this_label = $('<label />', {
            for: 'toggle-col-'+i,
            text: cells_by_column[i].heading_text
          });

          li_cache.push($('<li />').append($this_checkbox).append($this_label))
        }
      }

      view_model.$menu.$list.append(li_cache);
      view_model.$menu.prependTo(view_model.$wrapper);
      _initMenuInteractions(view_model);
    }


    function _initMenuInteractions() {
      view_model.$menu
        .on('click', 'button', _toggleMenuVisibility)
        .on('change', 'input[name="toggle-cols"]', _toggleColumn)
        .on('updateCheck', 'input[name="toggle-cols"]', _updateMenuCheckbox);

      // Update checkbox status on viewport changes.
      $(window).on('orientationchange resize', _updateCheckboxesOnViewportChange);

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
      // TODO: throttle this
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