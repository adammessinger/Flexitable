#To-Do List

* Better progress feedback.
* Complete README file
* "refresh" method to re-init cells by column without rebuilding and re-placing toggle menu. Useful for tables that have been rebuilt due to some ajax operation, but still have the same columns.
* Some kind of "processing" indicator that's shown after column checkbox clicked and hidden after the class changes are done. Gives visual feedback that something is, in fact, happening during the slow show/hide for very big tables. Already tried this with dimming/un-dimming table but the appearance change was too slow on a large table to be visible.
* Add a way (data attribute?) to associate a toolbar with a specific enhanced table. The toolbar will always be the next or previous sibling of the positioning target (the table by default), but something more explicit may be a nice-to-have.
* table search/filter, if it can be made fast enough