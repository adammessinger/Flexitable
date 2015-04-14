/**
 Flexitable jQuery plugin
 https://github.com/adammessinger/Flexitable
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
        toggle_columns: true,
        use_toggle_button: true,
        toggle_button_txt: 'Columns:',
        init_toggle_on_button_click: false,
        // NOTE: toolbar_position_target takes a CSS selector, DOM element, or
        // jQuery collection
        toolbar_position_target: $table,
        toolbar_before_or_after: 'before',
        destroy: false
      }, (user_config || {}));
      // The view model will contain all the data and methods we need for future
      // DOM manipulations.
      var viewModel = $table.data('Flexitable') || {
          id: $table[0].id,
          cfg: config,
          $table: $table,
          $toolbar: $('<div class="flexitable-toolbar" />')
        };

      if (config.toggle_columns && !viewModel.toggler) {
        viewModel.toggler = columnTogglerFactory(viewModel, i);
      }

      if (config.destroy) {
        viewModel.toggler.destroy();
      } else if (config.toggle_columns) {
        viewModel.toggler.init();
      }
    });
  };


  function columnTogglerFactory(view_model, i) {
    // $menu: will hold toggle menu container, menu, button, and progress bar
    var $menu = $('<div class="flexitable-menu flexitable-menu-closed" />');
    // column_maps_list: will hold an array of column data objects which track each
    // column's header element, header txt, cells, visibility, and persistence
    var column_maps_list = [];

    // public methods
    return {
      init: initColumnToggler,
      destroy: destroyColumnToggler
    };


    function initColumnToggler() {
      var is_lazy_init = view_model.cfg.use_toggle_button && view_model.cfg.init_toggle_on_button_click;
      var insert_button_disabled = !is_lazy_init;

      // Prevent re-initialization
      if (view_model.$table.data('Flexitable')) {
        return;
      }

      _setTableId();
      _insertTogglerButton(insert_button_disabled);
      if (is_lazy_init) {
        $menu.$button.one('click', function() {
          _disableTogglerMenu();
          _initTogglerButton().done(function() {
            _toggleMenuVisibility();
          });
        });
      } else {
        _initTogglerButton();
      }
    }


    function _setTableId() {
      // Set table ID if not specified
      if (!view_model.id) {
        view_model.id = 'flexitable-' + i;
        view_model.$table[0].id = view_model.id;
      }
    }


    function _insertTogglerButton(disabled) {
      if (view_model.cfg.use_toggle_button) {
        _buildMenuComponents();
        if (disabled) {
          _disableTogglerMenu();
        }
        _insertMenu();
      }
    }


    function _initTogglerButton() {
      var $headers = view_model.$table.find('> thead th');

      if ($headers.length) {
        // NOTE: "deferredEach" plugin is tacked onto the very bottom of this file
        return $.deferredEach($headers, _initCellsByHeader)
          .progress(_updateProgressMeter)
          .then(function() {
            // 'flexitable-active' class enables media queries, once above init gives
            // proper classes to cells
            view_model.$table.addClass('flexitable-active');

            if (view_model.cfg.use_toggle_button && column_maps_list.length) {
              _populateColumnList();
              _initMenuInteractions();
              _enableTogglerMenu();
            }

            view_model.$table.data('Flexitable', view_model);
            view_model.$table.trigger('toggle-initialized.flexitable');
          });
      }
    }


    function _initCellsByHeader(index, header) {
      var $header = $(header);
      var priority_class = $header.data('flexitablePriorityClass');
      // NOTE: cell_num is used for nth-child selectors, which aren't 0-indexed
      var cell_num = index + 1;
      var $col_cells = view_model.$table.find('> thead th:nth-child(' + cell_num + '), > tbody td:nth-child(' + cell_num + ')');
      // cell loop vars:
      var i, l;

      if (priority_class) {
        for (i = 0, l = $col_cells.length; i < l; i++) {
          $col_cells[i].className += (' ' + priority_class);
        }
      }

      column_maps_list[index] = {
        // NOTE: we're using the th's visibility as a proxy for the column's
        is_visible: ($header.css('display') === 'table-cell'),
        $th: $header,
        heading_text: $header.text(),
        is_persistent_col: $header.hasClass('persist'),
        $cells: $col_cells
      };
    }


    function _updateProgressMeter(amount_done, count, length) {
      var percent_complete = Math.round(amount_done * 100) + '%';
      var is_beginning = (count === 1);
      var is_ending = (count === length);

      $menu.$progress_bar.$amount.text(percent_complete);
      $menu.$progress_bar.css('width', percent_complete);

      if (is_beginning) {
        _showProgressBar();
      } else if (is_ending) {
        _hideProgressBar();
      }

      function _showProgressBar() {
        // since the progress bar's 100% height depends on its container having
        // a specified height, set an inline style to satisfy this even if the
        // plugin user's styles don't (Flexitable default styles leave height
        // set to "auto")
        $menu.$button.height($menu.$button.height());
        $menu.$progress_bar.removeClass('flexitable-hidden');
      }

      function _hideProgressBar() {
        // leave visible long enough for 100% completion to be visible to user,
        // then hide.
        setTimeout(function () {
          $menu.$progress_bar.addClass('flexitable-hidden');
          // get rid of inline height style
          $menu.$button.removeAttr('style');
        }, 250);
      }
    }


    function _buildMenuComponents() {
      $menu.$button = $('<button type="button" />').text(view_model.cfg.toggle_button_txt);
      $menu.$list = $('<ul />');
      $menu.$progress_bar = $('<div class="flexitable-toggle-progress-meter flexitable-hidden" />');
      $menu.$progress_bar.$amount = $('<span class="flexitable-toggle-progress-amt" />');

      $menu.$button.append($menu.$progress_bar.append($menu.$progress_bar.$amount));
      $menu
        .append($menu.$button)
        .append($menu.$list);
    }


    function _populateColumnList() {
      var checkbox_id_pfx = (view_model.id + '_toggle-col-');
      var li_cache = [];
      var i, l, $this_checkbox, $this_label;

      if ($menu.$list.is_populated) {
        $menu.$list.empty();
      }

      // populate with checkboxes for each non-persistent column
      for (i = 0, l = column_maps_list.length; i < l; i++) {
        if (!column_maps_list[i].is_persistent_col) {
          $this_checkbox = $('<input />', {
            type: 'checkbox',
            name: 'toggle-cols',
            id: (checkbox_id_pfx + i),
            value: i,
            'data-flexitable-id': view_model.id
          });
          $this_checkbox.prop('checked', column_maps_list[i].is_visible);

          $this_label = $('<label />', {
            'for': (checkbox_id_pfx + i),
            text: column_maps_list[i].heading_text
          });

          li_cache.push($('<li />').append($this_checkbox).append($this_label))
        }
      }

      $menu.$list.append(li_cache);
      $menu.$list.is_populated = true;
    }


    function _insertMenu() {
      var placement_method, $placement_target;

      view_model.$toolbar
        .append($menu)
        // Add a class to the toolbar to inform about menu presence & style accordingly
        .addClass('flexitable-toolbar-has-widgets');

      if (!view_model.$toolbar.is_inserted) {
        placement_method = view_model.cfg.toolbar_before_or_after.toLowerCase() === 'after'
          ? 'insertAfter'
          : 'insertBefore';
        // "jQuerify" the positioning target if it isn't already
        $placement_target = view_model.cfg.toolbar_position_target.jquery
          ? view_model.cfg.toolbar_position_target
          : $(view_model.cfg.toolbar_position_target);
        view_model.$toolbar[placement_method]($placement_target);
        view_model.$toolbar.is_inserted = true;
      }
    }


    function _disableTogglerMenu() {
      $menu.$button.prop('disabled', true);
    }


    function _enableTogglerMenu() {
      $menu.$button.prop('disabled', false);
    }


    function destroyColumnToggler() {
      if (!view_model.$table.data('Flexitable')) {
        return;
      }

      if (!$menu.hasClass('flexitable-menu-closed')) {
        _toggleMenuVisibility();
      }
      _disableTogglerMenu();

      // unbind click and viewport change listeners related to menu
      $(window).add(document).off('.flexitable');
      // remove active class to nix Flexitable media queries
      view_model.$table.removeClass('flexitable-active');

      // remove media priority classes from cells
      return $.deferredEach(column_maps_list, _removePriorityClasses)
        .progress(function(amount_done, count, length) {
          // passing (1 - amount_done) to run progress meter backward for destroy
          _updateProgressMeter((1 - amount_done), count, length);
        })
        .then(function() {
          // remove stored plugin data on the table
          view_model.$table.removeData('Flexitable');
          // signal completion, then unbind ALL Flexitable event handlers
          view_model.$table
            .trigger('toggle-destroyed.flexitable')
            .off('.flexitable');
          view_model.$toolbar.remove();
        });

      function _removePriorityClasses(i, column_data) {
        var priority_class = column_data.$th.data('flexitablePriorityClass');

        if (priority_class) {
          column_data.$cells.removeClass(priority_class);
        }
      }
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


    function _initMenuInteractions() {
      $menu
        .on('click', 'button', _toggleMenuVisibility)
        .on('change', 'input[name="toggle-cols"]', _toggleColumn)
        .on('updateCheck', 'input[name="toggle-cols"]', _updateMenuCheckbox);

      // Update checkbox status on viewport changes.
      $(window).on('orientationchange.flexitable resize.flexitable', _debounce(_updateCheckboxesOnViewportChange, 500));

      // Close menu when user clicks anywhere outside the menu.
      $(document).on('click.flexitable', _closeMenuOnOutsideClick);
    }


    function _toggleMenuVisibility() {
      $menu.toggleClass('flexitable-menu-closed');
    }


    function _closeMenuOnOutsideClick(event) {
      if (!$menu.find(event.target).length) {
        $menu.addClass('flexitable-menu-closed');
      }
    }


    function _toggleColumn(event) {
      var checkbox = event.target;
      // NOTE: checkbox value is the same as column index from column_maps_list
      var i_col = parseInt(checkbox.value, 10);

      column_maps_list[i_col].$cells
        .toggleClass('flexitable-cell-shown', checkbox.checked)
        .toggleClass('flexitable-cell-hidden', !checkbox.checked);

      // update column's active state
      column_maps_list[i_col].is_visible = checkbox.checked;
    }


    function _updateMenuCheckbox(event) {
      var checkbox = event.target;
      // NOTE: checkbox value is the same as column index from column_maps_list
      var i_col = parseInt(checkbox.value, 10);

      checkbox.checked = column_maps_list[i_col].is_visible;
    }


    function _updateCheckboxesOnViewportChange() {
      var i, l, cells_by_column = column_maps_list;

      // update active state of columns
      for (i = 0, l = cells_by_column.length; i < l; i++) {
        cells_by_column[i].is_visible = (cells_by_column[i].$th.css('display') === 'table-cell');
      }
      // update all checkboxes
      $menu.$list.find('input').trigger('updateCheck');
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
        parent_deferred.notify((i / length), i, length);
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
        parent_deferred.notify((i / keys.length), i, keys.length);
      };
      next();
    }

    $.when.apply(undefined, child_deferreds).then(function() {
      var notify_length = is_array ? length : keys.length;

      parent_deferred.notify(1, i, notify_length);
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