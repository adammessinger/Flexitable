#To-Do List

* [ ] Complete README file
* [ ] `refresh` method to re-init columns without rebuilding and re-placing
      toggle menu. Useful for tables that have been rebuilt due to some ajax
      operation, but still have the same columns.
* [ ] Option to save column visibility state using `localStorage` 
      ([issue #1](https://github.com/adammessinger/Flexitable/issues/1)). See
      [this issue comment](https://github.com/adammessinger/Flexitable/issues/1#issuecomment-187020897)
      for implementation ideas and notes.
* [ ] Some kind of "processing" indicator that's shown after column checkbox
      clicked and hidden after the class changes are done. Gives visual feedback
      that something is, in fact, happening during the slow show/hide for very
      big tables. Already tried this with dimming/un-dimming table but the
      appearance change was too slow on a large table to be visible. Consider 
      instead/also altering appearance of just-checked entries in column menu.
* [ ] Consider refactoring to use smaller objects instead of one monolithic 
      columnTogglerFactory. The factory function's role would then be composing
      these smaller objects (for toggle menu, toolbar, table) and returning some
      methods to attach to the view-model. Should make this more readable & make
      code reuse for search/filter easier if we go that route.
* [ ] Keep track of CSS selectors in a module-scope map object, so there's only
      one place to find and change them.
* [ ] Table search/filter, if it can be made fast enough. This quick proof-of-concept 
      was reasonably fast on a table with 4200 rows and 34 columns, with showing/hiding
      being the slowest part:

      ```javascript
      function testSearch(search_str) {
        var $rows = $('tbody > tr');
        var row_strings = [];
        var rows_hidden = [];
        hidden = null;
      
        $rows.each(function(i, el) {
          row_strings[i] = $(el).text().toLocaleLowerCase().trim().replace(/\s{2,}/g, ' ');
        });
      
        console.log(foo);
      
        search_str = search_str.toLocaleLowerCase();
      
        for (var i = 0, l = all.length; i < l; i++) {
          if (row_strings[i].indexOf(search_str) === -1) {
            rows_hidden.push($rows[i]);
          }
        }
      
        console.log(rows_hidden);
        
        console.log($rows.filter(rows_hidden).addClass('flexitable-hidden'));
        console.log($rows.not(rows_hidden).removeClass('flexitable-hidden'));
      }
      
      testSearch('zorb');
      ```
* [x] Lazy caching of column cells in `column_maps_list[i].$cells` -- 
      leave `null` to start with, then query & cache when checked/unchecked in
      menu. Preliminary tests show that this would reduce by more than half the
      time needed to iterate over a table's columns, populate `column_maps_list`,
      and build the columns menu.
