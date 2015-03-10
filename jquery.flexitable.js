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
  var essential_class = 'essential';
  var optional_class = 'optional';

  $.fn.mediaTable = function(user_config) {    return this.each(function(i) {
      var $table = $(this);
      var config = $.extend({
        menu: true,
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

    // Menu initialization logic.
    // NOTE: current logic requires this MUST run before column init
    if (wdg.cfg.menu) {
      _initMenu(wdg);
    }

    // Columns Initialization Loop. Table detached from DOM first for > 90% ++perf.
    wdg.$table.detach();
    wdg.$table.find('thead th').each(function(i) {
      _initHeaders.call(this, i, wdg);
    });
    wdg.$table.appendTo(wdg.$wrapper);
    // update menu checkboxes, since no columns were visible when they were created
    // TODO: this is slow, so figure out a way to speed it up or build menu after table init
    wdg.$menu.find('input').trigger('updateCheck');

    // Save widget data on table
    wdg.$table.data('MediaTable', wdg);
  }


  function _initMenu(wdg) {
    // Build menu objects
    wdg.$menu = $('<div class="mediaTableMenu mediaTableMenuClosed" />');
    wdg.$menu.$button = $('<button type="button" />');
    wdg.$menu.$list = $('<ul />');

    // Setup menu general properties and append to DOM.
    wdg.$menu
      .append(wdg.$menu.$button)
      .append(wdg.$menu.$list);

    // Add a class to the wrapper to inform about menu presence.
    wdg.$wrapper.addClass('mediaTableWrapperWithMenu');

    // Setup menu title (handler)
    wdg.$menu.$button.text(wdg.cfg.button_title);
    wdg.$menu.appendTo(wdg.$wrapper);

    // Bind screen change events to update checkbox status of displayed fields.
    // TODO: debounce this
    $(window).bind('orientationchange resize', function() {
      wdg.$menu.find('input').trigger('updateCheck');
    });

    // Toggle menu visibility when clicking the menu button.
    wdg.$menu.$button.on('click', function() {
      wdg.$menu.toggleClass('mediaTableMenuClosed');
    });

    // Close menu when user clicks outside the menu.
    $(document).on('click', function(event) {
      if (!wdg.$menu.find(event.target).length) {
        wdg.$menu.addClass('mediaTableMenuClosed')
      }
    });
  }


  // TODO: flesh out to replace other init functions
  function _initCellsByHeader(wdg) {
    var $headers = wdg.$table.find('thead th');
    var $table_cell_containers = wdg.$table.find('thead, tbody');
    // cells_by_column: array of objects w/ each col's header txt and contained cells
    var cells_by_column = [];
    // loop vars:
    var is_optional_col, is_essential_col, cell_num, $col_cells, i, l;

    if (!$headers.length) {
      return;
    }

    for (i = 0, l = $headers.length; i < l; i++) {
      is_essential_col = $headers.eq(i).hasClass(essential_class);
      is_optional_col = $headers.eq(i).hasClass(optional_class);
      // NOTE: cell_num is used for nth-child selectors, which aren't 0-indexed
      cell_num = i + 1;
      $col_cells = $table_cell_containers.find('th:nth-child('+cell_num+'), td:nth-child('+cell_num+')');

      $col_cells
        .toggleClass(essential_class, is_essential_col)
        .toggleClass(optional_class, is_optional_col);

      cells_by_column.push({
        heading: $headers.eq(i).text(),
        cells: $col_cells
      });
    }

    // store cell column info for use in menu init and elsewhere
    wdg.cells_by_column = cells_by_column;
  }


  function _initHeaders(i, wdg) {
    var $th = $(this);
    var id = $th.attr('id');
    var classes = $th.attr('class');

    // Set up an auto-generated ID for the column.
    // the ID is based upon widget's ID to allow multiple tables into one page.
    if (!id) {
      id = wdg.id + '-mediaTableCol-' + i;
      $th.attr('id', id);
    }

    // Add toggle link to the menu.
    if (wdg.cfg.menu && !$th.is('.persist')) {
      var $li = $('<li><input type="checkbox" name="toggle-cols" id="toggle-col-' + wdg.id + '-' + i + '" value="' + id + '" /> <label for="toggle-col-' + wdg.id + '-' + i + '">' + $th.text() + '</label></li>');
      wdg.$menu.$list.append($li);

      _initColumnCheckbox($th, $li.find('input'), wdg);
    }

    // Propagate column's properties to each cell.
    wdg.$table.find('> tbody tr').each(function() {
      _initRows.call(this, i, id, classes);
    });
  }


  function _initRows(i, id, classes) {
    var $cell = $(this).find('td,th').eq(i);

    $cell.attr('headers', id);

    if (classes) {
      $cell.addClass(classes);
    }
  }


  function _initColumnCheckbox($th, $checkbox, wdg) {
    $checkbox
      .on('change', toggleColumn)
      .on('updateCheck', updateCheck)
      .trigger('updateCheck');

    function toggleColumn() {
      // val: equals the header's ID, i.e. "toggle-col-company-3"
      var val = $checkbox[0].value;
      // cols: find the matching header (#toggle-col-company-3)
      // and cells ([headers="toggle-col-company-3"])
      var cols = wdg.$table.find("#" + val + ", [headers=" + val + "]");

      cols.toggleClass('mediaTableCellHidden', !$checkbox[0].checked);
    }

    function updateCheck(event) {
      event.target.checked = ($th.css('display') === 'table-cell');
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