/**
 Flexitable jQuery plugin
 Copyright (c) 2015 Adam Messinger, http://zenscope.com/
 Released under the MIT license, see LICENSE file for details.

 This plugin owes its starting point to the work of:
   Marco Pegoraro, http://movableapp.com/: https://github.com/marcopeg/MediaTable
   Nick Burwell, http://nickburwell.com: https://github.com/nburwell/ResponsiveTable
 ...and also borrows some ideas from Tablesaw by Filament Group:
   https://github.com/filamentgroup/tablesaw
 **/

;(function($) {
  var persistent_class = 'persist';
  var essential_class = 'essential';
  var optional_class = 'optional';

  $.fn.mediaTable = function(user_config) {    return this.each(function(i) {
      var $table = $(this);
      var config = $.extend({
        has_menu: true,
        button_title: 'Columns:',
        //t: 'e',
        destroy: false
      }, (user_config || {}));

      if (config.destroy) {
        _destroyFlexitable($table);
      } else {
        _initFlexitable($table, config, i);
      }
    });
  };


  /**
   * Flexitable DOM Initialization
   */
  function _initFlexitable($table, config, i) {
    var wdg, existing_wdg = $table.data('MediaTable');

    // Prevent re-initialization
    if (!!existing_wdg && existing_wdg.$wrapper) {
      return;
    }

    // Build the widget context.
    wdg = {
      $table: $table,
      $wrapper: $('<div class="mediaTableWrapper" />'),
      // $menu: will hold column toggle menu container
      $menu: null,
      // cfg: this table's Flexitable config
      cfg: config,
      id: $table[0].id
    };

    // Set table ID if not specified
    if (!wdg.id) {
      wdg.id = 'MediaTable-' + i;
      wdg.$table[0].id = wdg.id;
    }

    wdg.$table.addClass('activeMediaTable');

    // Place the wrapper near the table
    wdg.$table.before(wdg.$wrapper);

    wdg.$table.detach();
    _initCellsByHeader(wdg);
    wdg.$table.appendTo(wdg.$wrapper);

    // Menu initialization.
    // NOTE: MUST run after column init, not before
    if (wdg.cfg.has_menu) {
      _buildMenu(wdg);
      _initMenuInteractions(wdg);
    }

    // Save widget data on table
    wdg.$table.data('MediaTable', wdg);
  }


  function _initCellsByHeader(wdg) {
    var $headers = wdg.$table.find('thead th');
    // cells_by_column: array of objects w/ each col's header txt and contained cells
    var cells_by_column = [];
    // loop vars:
    var is_optional_col, is_essential_col, is_persistent_col;
    var cell_num, $this_header, $col_cells, i, l;

    if (!$headers.length) {
      if (window.console && console.warn) {
        console.warn('No headers in table#' + wdg.$table[0].id);
      }
      return;
    }

    for (i = 0, l = $headers.length; i < l; i++) {
      $this_header = $headers.eq(i);
      is_persistent_col = $this_header.hasClass(persistent_class);
      is_essential_col = $this_header.hasClass(essential_class);
      is_optional_col = $this_header.hasClass(optional_class);
      // NOTE: cell_num is used for nth-child selectors, which aren't 0-indexed
      cell_num = i + 1;
      $col_cells = wdg.$table.find('thead th:nth-child('+cell_num+'), tbody td:nth-child('+cell_num+')');

      $col_cells
        .toggleClass(essential_class, is_essential_col)
        .toggleClass(optional_class, is_optional_col);

      cells_by_column.push({
        heading_text: $this_header.text(),
        is_persistent_col: is_persistent_col,
        // NOTE: no need to store cells for persistent columns, so we don't to save memory
        $cells: is_persistent_col ? null : $col_cells
      });
    }

    // store cell column info for use in menu init and elsewhere
    wdg.cells_by_column = cells_by_column;
  }


  function _buildMenu(wdg) {
    var cells_by_column = wdg.cells_by_column;
    var li_cache = [];
    var i, l, $this_checkbox, $this_label, $matching_th;

    // Build menu containers
    wdg.$menu = $('<div class="mediaTableMenu mediaTableMenuClosed" />');
    wdg.$menu.$button = $('<button type="button" />').text(wdg.cfg.button_title);
    wdg.$menu.$list = $('<ul />');
    wdg.$menu
      .append(wdg.$menu.$button)
      .append(wdg.$menu.$list);

    // Add a class to the wrapper to inform about menu presence.
    wdg.$wrapper.addClass('mediaTableWrapperWithMenu');

    // populate menu with checkboxes for each non-persistent column
    for (i = 0, l = cells_by_column.length; i < l; i++) {
      if (!cells_by_column[i].is_persistent_col) {
        $matching_th = cells_by_column[i].$cells.filter('th');
        $this_checkbox = $('<input />', {
          type: 'checkbox',
          name: 'toggle-cols',
          id: 'toggle-col-'+i,
          value: i
        });
      $this_checkbox
        .data('cells', cells_by_column[i].$cells)
        // we're using the column heading's visibility as a proxy for the column's
        .prop('checked', ($matching_th.css('display') === 'table-cell'));

        $this_label = $('<label />', {
          for: 'toggle-col-'+i,
          text: cells_by_column[i].heading_text
        });

        li_cache.push($('<li />').append($this_checkbox).append($this_label))
      }
    }

    wdg.$menu.$list.append(li_cache);
    wdg.$menu.prependTo(wdg.$wrapper);
  }


  function _initMenuInteractions(wdg) {
    // Update checkbox status on viewport changes.
    $(window).on('orientationchange resize', _updateCheckboxes);
    // Close menu when user clicks outside the menu.
    $(document).on('click', _closeMenuOnOutsideClick);
    wdg.$menu
      .on('click', 'button', _toggleMenu)
      .on('change', 'input[name="toggle-cols"]', _toggleColumn)
      .on('updateCheck', 'input[name="toggle-cols"]', _updateCheckbox);


    // TODO: debounce this
    function _updateCheckboxes() {
      wdg.$menu.$list.find('input').trigger('updateCheck');
    }

    function _closeMenuOnOutsideClick(event) {
      if (!wdg.$menu.find(event.target).length) {
        wdg.$menu.addClass('mediaTableMenuClosed');
      }
    }

    function _toggleMenu() {
      wdg.$menu.toggleClass('mediaTableMenuClosed');
    }

    function _toggleColumn(event) {
      $(event.target).data('cells').toggleClass('mediaTableCellHidden', !event.target.checked);
    }

    function _updateCheckbox(event) {
      // NOTE: checkbox value is the same as column index from wdg.cells_by_column
      var $checkbox = $(event.target);
      // $matching_th: we're using the th's visibility as a proxy for the whole column's
      var $matching_th = $checkbox.data('cells').filter('th');

      $checkbox[0].checked = ($matching_th.css('display') === 'table-cell');
    }
  }


  /**
   * Flexitable Widget Destruction
   */
  function _destroyFlexitable($table) {
    // Get the widget context.
    var wdg = $table.data('MediaTable');

    if (!wdg) {
      return;
    }

    // Remove the wrapper from the table.
    wdg.$wrapper.after(wdg.$table).remove();

    // Remove Flexitable active class so media-query will not work.
    wdg.$table.removeClass('activeMediaTable');

    // Remove DOM reference to the widget context.
    wdg.$table.data('MediaTable', null);
  }
})(jQuery);