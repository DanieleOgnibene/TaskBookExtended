'use strict';

module.exports = `
    Usage
        $ tb [<options> ...]
    
        Options
            none             Display timeline view by deadlines
          --setLink          Set a link to the item
          --removeLink       Remove the item's link
          --viewLink         View the item's link
          --table            Display tasks in a grid
          --initDir          Init main directory (it is used to push data to GitHub)
          --save             Commit and push the changes in the default folder specified in taskbook.json (remember to init git)
          --boards           Display all boards
          --addBoard         Add a board (@BoardName) to target ids
          --addTime          Add the amount of minutes to target ids (@ids)
          --archive, -a      Display archived items
          --begin, -b        Start/pause task
          --bug              Toggle bug property      
          --check, -c        Check/uncheck task
          --clear            Delete all checked items
          --copy, -y         Copy item description
          --delete, -d       Delete item
          --hardDelete, -D   Hard delete item
          --edit, -e         Edit item (@id) description
          --find, -f         Search for items
          --help, -h         Display help message
          --list, -l         List items by attributes
          --move, -m         Move item (@ids) between boards
          --moveToDate       Move items with ids (@ids) to selected date (YYYY/MM/DD)
          --moveToToday      Move items with ids to today date
          --note, -n         Create note
          --priority, -p     Update priority of tasks (@ids)
          --removeBoard      Remove a board from an item
          --removeDeadline   Remove the deadline from tasks
          --resetDate        Move items with ids to their creation date
          --clearTimer       Clear timer from target ids
          --clearTime        Clear total time from target ids
          --restore, -r      Restore items from archive
          --star, -s         Star/unstar item
          --task, -t         Create task
          --timeline, -i     Display timeline view by creation date
          --version, -v      Display installed version
          
    
        Examples
          $ tb
          $ tb --table
          $ tb --initDir path
          $ tb --setLink @2 link
          $ tb --removeLink 2 
          $ tb --viewLink 2
          $ tb --save
          $ tb --boards
          $ tb --addBoard 2 @newBoard
          $ tb --addTime @3 @5 40
          $ tb --archive
          $ tb --begin 2 3
          $ tb --bug 2 3
          $ tb --check 1 2
          $ tb --clear
          $ tb --copy 1 2 3
          $ tb --delete 4
          $ tb --edit @3 Merge PR #42
          $ tb --find documentation
          $ tb --list pending coding
          $ tb --move @1 cooking
          $ tb --moveToDate @1 @2 2020/01/25
          $ tb --moveToToday 1 2
          $ tb --note @coding Mergesort worse-case O(nlogn)
          $ tb --priority @3 2
          $ tb --removeBoard 3 @boardName
          $ tb --removeDate 3 2
          $ tb --resetDate 3 2
          $ tb --restore 4
          $ tb --clearTimer 3 5 
          $ tb --clearTime 3 5
          $ tb --star 2
          $ tb --task @coding @reviews Review PR #42
          $ tb --task @coding Improve documentation
          $ tb --task Make some buttercream p:2
          $ tb --task This is a bug b:true
`;
