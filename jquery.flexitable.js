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
  var persistent_css_class = 'persist';
  var essential_css_class = 'essential';
  var optional_css_class = 'optional';

  $.fn.mediaTable = function(user_config) {    return this.each(function(i) {
      var $table = $(this);
      var config = $.extend({
        has_menu: true,
        button_title: 'Columns:',
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

    _initCellsByHeader(wdg);

    wdg.$table
      // class enables media queries, once above init gives proper classes to cells
      .addClass('activeMediaTable')
      .before(wdg.$wrapper);
    // NOTE: using standard .appendChild() here because it saves 500-700ms in
    // IE 11 vs. jQ .appendTo()
    wdg.$wrapper[0].appendChild(wdg.$table[0]);

    // Menu initialization.
    // NOTE: MUST run after column init, not before
    if (wdg.cfg.has_menu) {
      _buildMenu(wdg);
    }

    // Save widget data on table
    wdg.$table.data('MediaTable', wdg);
  }


  function _initCellsByHeader(wdg) {
    var $headers = wdg.$table.find('thead th');
    // cells_by_column: array of objects w/ each col's header txt and contained cells
    var cells_by_column = [];
    // the remaining are loop vars:
    var is_optional_col, is_essential_col, is_persistent_col;
    var cell_num, $this_header, $col_cells;
    var i_headers, l_headers, i_cells, l_cells;

    if (!$headers.length) {
      if (window.console && console.warn) {
        console.warn('No headers in table#' + wdg.id);
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
      $col_cells = wdg.$table.find('thead th:nth-child(' + cell_num + '), tbody td:nth-child(' + cell_num + ')');

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
        is_active: ($this_header.css('display') === 'table-cell'),
        $th: $this_header,
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
    var i, l, $this_checkbox, $this_label;

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
        $this_checkbox = $('<input />', {
          type: 'checkbox',
          name: 'toggle-cols',
          id: 'toggle-col-'+i,
          value: i
        });
      $this_checkbox.prop('checked', cells_by_column[i].is_active);

        $this_label = $('<label />', {
          for: 'toggle-col-'+i,
          text: cells_by_column[i].heading_text
        });

        li_cache.push($('<li />').append($this_checkbox).append($this_label))
      }
    }

    wdg.$menu.$list.append(li_cache);
    wdg.$menu.prependTo(wdg.$wrapper);

    _initMenuInteractions(wdg);
  }


  function _initMenuInteractions(wdg) {
    // Update checkbox status on viewport changes.
    $(window).on('orientationchange resize', _updateMenu);
    // Close menu when user clicks outside the menu.
    $(document).on('click', _closeMenuOnOutsideClick);
    wdg.$menu
      .on('click', 'button', _toggleMenu)
      .on('change', 'input[name="toggle-cols"]', _toggleColumn)
      .on('updateCheck', 'input[name="toggle-cols"]', _updateCheckbox);


    // TODO: debounce this
    function _updateMenu() {
      var i, l, cells_by_column = wdg.cells_by_column;

      // update active state of columns
      for (i = 0, l = cells_by_column.length; i < l; i++) {
        cells_by_column[i].is_active = (cells_by_column[i].$th.css('display') === 'table-cell');
      }
      // update all checkboxes
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
      var checkbox = event.target;
      // NOTE: checkbox value is the same as column index from wdg.cells_by_column
      var i_col = parseInt(checkbox.value, 10);

      wdg.cells_by_column[i_col].$cells
        .toggleClass('mediaTableCellShown', checkbox.checked)
        .toggleClass('mediaTableCellHidden', !checkbox.checked);

      // update active state in wdg
      wdg.cells_by_column[i_col].is_active = checkbox.checked;
    }

    function _updateCheckbox(event) {
      var checkbox = event.target;
      // NOTE: checkbox value is the same as column index from wdg.cells_by_column
      var i_col = parseInt(checkbox.value, 10);

      checkbox.checked = wdg.cells_by_column[i_col].is_active;
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