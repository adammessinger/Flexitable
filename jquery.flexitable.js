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
   * =Initialization
   */
  function _initFlexitable($table, config, i) {
    var view_model;
    var existing_view_model = $table.data('MediaTable');

    // Prevent re-initialization
    if (!!existing_view_model && existing_view_model.$wrapper) {
      return;
    }

    // view_model will contain all the data we need for future DOM manipulations.
    // Much faster than revisiting the DOM repeatedly.
    view_model = {
      id: $table[0].id,
      // cfg: this table's Flexitable config
      cfg: config,
      $table: $table,
      $wrapper: $('<div class="mediaTableWrapper" />'),
      // $menu: will hold column toggle menu
      $menu: null,
      // cells_by_column: array of objects w/ each col's header txt & th,
      // contained cells, and visibility & persistence states
      cells_by_column: []
    };

    // Set table ID if not specified
    if (!view_model.id) {
      view_model.id = 'MediaTable-' + i;
      view_model.$table[0].id = view_model.id;
    }

    _initCellsByHeader(view_model);

    view_model.$table
      // class enables media queries, once above init gives proper classes to cells
      .addClass('activeMediaTable')
      .before(view_model.$wrapper);
    // NOTE: using standard .appendChild() here because it saves 500-700ms in
    // IE 11 vs. jQ .appendTo()
    view_model.$wrapper[0].appendChild(view_model.$table[0]);

    // Menu initialization.
    // NOTE: MUST run after column init, not before
    if (view_model.cfg.has_menu) {
      _buildMenu(view_model);
    }

    // Save view model data on table
    view_model.$table.data('MediaTable', view_model);
  }


  function _initCellsByHeader(view_model) {
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


  function _buildMenu(view_model) {
    var cells_by_column = view_model.cells_by_column;
    var li_cache = [];
    var i, l, $this_checkbox, $this_label;

    // Build menu containers
    view_model.$menu = $('<div class="mediaTableMenu mediaTableMenuClosed" />');
    view_model.$menu.$button = $('<button type="button" />').text(view_model.cfg.button_title);
    view_model.$menu.$list = $('<ul />');
    view_model.$menu
      .append(view_model.$menu.$button)
      .append(view_model.$menu.$list);

    // Add a class to the wrapper to inform about menu presence.
    view_model.$wrapper.addClass('mediaTableWrapperWithMenu');

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


  function _initMenuInteractions(view_model) {
    // Update checkbox status on viewport changes.
    $(window).on('orientationchange resize', _updateMenuOnViewportChange);
    // Close menu when user clicks outside the menu.
    $(document).on('click', _closeMenuOnOutsideClick);
    view_model.$menu
      .on('click', 'button', _toggleMenu)
      .on('change', 'input[name="toggle-cols"]', _toggleColumn)
      .on('updateCheck', 'input[name="toggle-cols"]', _updateCheckbox);


    // TODO: throttle this
    function _updateMenuOnViewportChange() {
      var i, l, cells_by_column = view_model.cells_by_column;

      // update active state of columns
      for (i = 0, l = cells_by_column.length; i < l; i++) {
        cells_by_column[i].is_visible = (cells_by_column[i].$th.css('display') === 'table-cell');
      }
      // update all checkboxes
      view_model.$menu.$list.find('input').trigger('updateCheck');
    }

    function _closeMenuOnOutsideClick(event) {
      if (!view_model.$menu.find(event.target).length) {
        view_model.$menu.addClass('mediaTableMenuClosed');
      }
    }

    function _toggleMenu() {
      view_model.$menu.toggleClass('mediaTableMenuClosed');
    }

    function _toggleColumn(event) {
      var checkbox = event.target;
      // NOTE: checkbox value is the same as column index from view_model.cells_by_column
      var i_col = parseInt(checkbox.value, 10);

      view_model.cells_by_column[i_col].$cells
        .toggleClass('mediaTableCellShown', checkbox.checked)
        .toggleClass('mediaTableCellHidden', !checkbox.checked);

      // update active state in view_model
      view_model.cells_by_column[i_col].is_visible = checkbox.checked;
    }

    function _updateCheckbox(event) {
      var checkbox = event.target;
      // NOTE: checkbox value is the same as column index from view_model.cells_by_column
      var i_col = parseInt(checkbox.value, 10);

      checkbox.checked = view_model.cells_by_column[i_col].is_visible;
    }
  }


  /**
   * =Destroy Flexitable enhancement on passed table
   */
  function _destroyFlexitable($table) {
    var view_model = $table.data('MediaTable');

    if (!view_model) {
      return;
    }

    view_model.$menu.remove();
    view_model.$wrapper.after(view_model.$table).remove();

    // remove active class to nix Flexitable media queries
    view_model.$table.removeClass('activeMediaTable');

    // remove stored view model data on the table
    view_model.$table.data('MediaTable', null);
  }
})(jQuery);