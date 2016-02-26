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
        lazy_column_caching: false,
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
    // TODO: consider collecting next 3 vars in a cfg_inferences object
    var has_lazy_init = (view_model.cfg.use_toggle_button && view_model.cfg.init_toggle_on_button_click);
    var has_lazy_col_cache = (view_model.cfg.use_toggle_button && view_model.cfg.lazy_column_caching);
    var can_use_responsive_cols = (!has_lazy_init && !has_lazy_col_cache);

    // public methods
    return {
      init: initColumnToggler,
      destroy: destroyColumnToggler
    };


    function initColumnToggler() {
      var is_button_inserted_disabled = !has_lazy_init;

      // Prevent re-initialization
      if (view_model.$table.data('Flexitable')) {
        return;
      }

      _setTableId();
      _insertTogglerButton(is_button_inserted_disabled);
      if (has_lazy_init) {
        $menu.$button.one('click', function() {
          _disableTogglerMenu();
          _initTogglerButton()
            .done(function() {
              _toggleMenuVisibility(true);
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
        view_model.$table.trigger('toggle-menu-placed.flexitable', [$menu, view_model.$toolbar]);
      }
    }


    function _initTogglerButton() {
      var $headers = view_model.$table.find('> thead th');

      if ($headers.length) {
        // NOTE: "deferredEach" plugin is tacked onto the very bottom of this file
        return $.deferredEach($headers, _initCellsByHeader)
          .progress(_updateProgressMeter)
          .then(function() {
            if (can_use_responsive_cols) {
              _toggleResponsiveMediaQueries(true);
            }

            if (view_model.cfg.use_toggle_button && column_maps_list.length) {
              _populateColumnList();
              _initMenuInteractions();
              _updateCheckboxesFromColumnVisibility();
              _enableTogglerMenu();
            }

            view_model.$table.data('Flexitable', view_model);
            view_model.$table.trigger('toggle-initialized.flexitable');
          });
      }
    }


    function _initCellsByHeader(index, header, is_lazy_cache_store) {
      var $header = $(header);
      var priority_class = $header.data('flexitablePriorityClass');
      // NOTE: cell_num is used for nth-child selectors, which aren't 0-indexed
      var cell_num = index + 1;
      var $col_cells = (has_lazy_col_cache && !is_lazy_cache_store)
        ? null
        : view_model.$table.find('> thead th:nth-child(' + cell_num + '), > tbody td:nth-child(' + cell_num + ')');
      // cell loop vars:
      var i, l;

      if (is_lazy_cache_store) {
        column_maps_list[index].$cells = $col_cells;
        return;
      }

      // if responsive columns are available, propagate priority classes to cells in column
      if (priority_class && can_use_responsive_cols) {
        for (i = 0, l = $col_cells.length; i < l; i++) {
          $col_cells[i].className += (' ' + priority_class);
        }
      }

      column_maps_list[index] = {
        // NOTE: we're using the th's visibility as a proxy for the column's
        is_visible: ($header.css('display') === 'table-cell'),
        $th: $header,
        heading_text: $header.text(),
        is_persistent_col: (priority_class === 'persist'),
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
        $menu.$progress_bar.addClass('flexitable-hidden');
        // get rid of inline height style
        $menu.$button.removeAttr('style');
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

      // NOTE: Both appending the menu and adding the class above will silently
      // fail if they've been done before (e.g. on refresh, a pending feature).
      // However, actually adding the toolbar to the page (below) is something
      // we don't want to bother with if it's already been taken care of by the
      // search module (another pending feature).
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
        _toggleMenuVisibility(false);
      }
      _disableTogglerMenu();

      _toggleResponsiveMediaQueries(false);

      // unbind click and viewport change listeners related to menu
      $(window).add(document).off('.flexitable');

      // remove media priority classes from cells
      return $.deferredEach(column_maps_list, _removePriorityClasses)
        .progress(function(amount_done, count, length) {
          // passing (1 - amount_done) to run progress meter backward for destroy
          _updateProgressMeter((1 - amount_done), count, length);
        })
        .then(function() {
          view_model.$toolbar.remove();
          // remove stored plugin data on the table
          view_model.$table.removeData('Flexitable');
          // signal completion, then unbind ALL Flexitable event handlers
          view_model.$table
            .trigger('toggle-destroyed.flexitable')
            .off('.flexitable');
        });

      function _removePriorityClasses(i, column_data) {
        // NOTE: Function does nothing if lazy init or lazy column caching is on,
        // both of which disable responsive design features.
        var priority_class = can_use_responsive_cols
          ? column_data.$th.data('flexitablePriorityClass')
          : null;
        var $target = column_data.$cells;

        if (priority_class && $target && $target.length) {
          $target.removeClass(priority_class);
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
        .on('click', 'button', function() {
          _toggleMenuVisibility($menu.hasClass('flexitable-menu-closed'));
        })
        .on('change', 'input[name="toggle-cols"]', function(event) {
          _toggleColumnVisibility(event.target.value, event.target.checked);
        });

      // Update checkboxes on viewport changes, no more than once every 1/2 second.
      $(window).on('orientationchange.flexitable resize.flexitable',
        _debounce(_updateCheckboxesFromColumnVisibility, 500));

      $(document).on('click.flexitable', _closeMenuOnOutsideClick);
    }


    function _toggleMenuVisibility(will_show) {
      will_show = Boolean(will_show);
      $menu.toggleClass('flexitable-menu-closed', !will_show);
    }


    function _toggleColumnVisibility(col_index, will_show) {
      col_index = parseInt(col_index, 10);
      will_show = Boolean(will_show);

      if (isNaN(col_index)) {
        throw new Error('_toggleColumnVisibility: col_index arg is missing or a non-number');
      }
      if (column_maps_list[col_index] === undefined) {
        throw new Error('_toggleColumnVisibility: col_index arg refers to a non-existent column');
      }

      if (has_lazy_col_cache && !column_maps_list[col_index].$cells) {
        _initCellsByHeader(col_index, column_maps_list[col_index].$th[0], true);
      }

      column_maps_list[col_index].$cells
        .toggleClass('flexitable-cell-shown', will_show)
        .toggleClass('flexitable-cell-hidden', !will_show);

      column_maps_list[col_index].is_visible = will_show;
    }


    function _toggleMenuCheckbox(col_index, will_check) {
      // NOTE: checkbox value is the same as column index from column_maps_list
      var checkbox = $menu.$list.find('input[value=' + col_index + ']')[0];
      will_check = Boolean(will_check);

      if (checkbox) {
        checkbox.checked = will_check;
      } else {
        throw new Error('_toggleMenuCheckbox: checkbox not found');
      }
    }


    function _toggleResponsiveMediaQueries(will_activate) {
      will_activate = Boolean(will_activate);
      view_model.$table.toggleClass('flexitable-active', will_activate);
    }


    function _updateCheckboxesFromColumnVisibility() {
      var i, l, old_vis_state;

      for (i = 0, l = column_maps_list.length; i < l; i++) {
        old_vis_state = column_maps_list[i].is_visible;
        column_maps_list[i].is_visible = (column_maps_list[i].$th.css('display') === 'table-cell');

        if (old_vis_state !== column_maps_list[i].is_visible) {
          _toggleMenuCheckbox(i, column_maps_list[i].is_visible);
        }
      }
    }


    function _closeMenuOnOutsideClick(event) {
      if (!$menu.find(event.target).length) {
        _toggleMenuVisibility(false);
      }
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