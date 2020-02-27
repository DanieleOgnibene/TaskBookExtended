#!/usr/bin/env node
'use strict';
const clipboardy = require('clipboardy');
const Task = require('./task');
const Note = require('./note');
const Storage = require('./storage');
const render = require('./render');

class Taskbook {
    constructor() {
        this._storage = new Storage();
    }

    get _archive() {
        return this._storage.getArchive();
    }

    get _data() {
        return this._storage.get();
    }

    _arrayify(x) {
        return Array.isArray(x) ? x : [x];
    }

    _save(data) {
        this._storage.set(data);
    }

    _saveArchive(data) {
        this._storage.setArchive(data);
    }

    _removeDuplicates(x) {
        return [...new Set(this._arrayify(x))];
    }

    _generateID(data = this._data) {
        const ids = Object.keys(data).map(id => parseInt(id, 10));
        const max = (ids.length === 0) ? 0 : Math.max(...ids);
        return max + 1;
    }

    _validateIDs(inputIDs, existingIDs = this._getIDs()) {
        if (inputIDs.length === 0) {
            render.missingID();
            process.exit(1);
        }

        inputIDs = this._removeDuplicates(inputIDs);

        inputIDs.forEach(id => {
            if (existingIDs.indexOf(Number(id)) === -1) {
                render.invalidID(id);
                process.exit(1);
            }
        });

        return inputIDs;
    }

    _isPriorityOpt(x) {
        return ['p:1', 'p:2', 'p:3'].indexOf(x) > -1;
    }

    _isBugOpt(x) {
        return ['b:true', 'b:false'].indexOf(x) > -1;
    }

    _isDateOpt(x) {
        const dateIdentifier = 'date:';
        return x.startsWith(dateIdentifier);
    }

    _getBoards() {
        const {_data} = this;
        const boards = ['My Board'];

        Object.keys(_data).forEach(id => {
            boards.push(..._data[id].boards.filter(x => boards.indexOf(x) === -1));
        });

        return boards;
    }

    _getCreationDates(data = this._data) {
        const dates = [];

        Object.keys(data).forEach(id => {
            if (dates.indexOf(data[id]._date) === -1) {
                dates.push(data[id]._date);
            }
        });

        return dates;
    }

    _getDeadlines(data = this._data) {
        const dates = [];

        Object.keys(data).forEach(id => {
            if (dates.indexOf(data[id].deadline) === -1) {
                dates.push(data[id].deadline);
            }
        });

        return dates;
    }

    _getIDs(data = this._data) {
        return Object.keys(data).map(id => parseInt(id, 10));
    }

    _getPriority(desc) {
        const opt = desc.find(x => this._isPriorityOpt(x));
        return opt ? opt[opt.length - 1] : 1;
    }

    _getIsBug(desc) {
        const opt = desc.find(x => this._isBugOpt(x));
        return !!opt ? opt.replace('b:', '').includes('true') : false;
    }

    _getDeadline(desc) {
        const dateInput = desc
            .filter(x => this._isDateOpt(x))
            .map(target => target.replace('date:', ''))
            .shift();
        return dateInput ? this._convertDateStringInput(dateInput) : undefined;
    }

    _getOptions(input) {
        const [boards, desc] = [[], []];

        if (input.length === 0) {
            render.missingDesc();
            process.exit(1);
        }

        const id = this._generateID();
        const priority = this._getPriority(input);
        const isBug = this._getIsBug(input);
        const deadline = this._getDeadline(input);

        input.forEach(x => {
            if (!this._isPriorityOpt(x) && !this._isBugOpt(x) && !this._isDateOpt(x)) {
                return x.startsWith('@') && x.length > 1 ? boards.push(x) : desc.push(x);
            }
        });

        const description = desc.join(' ');

        if (boards.length === 0) {
            boards.push('My board');
        }

        return {boards, description, id, priority, isBug, deadline};
    }

    _getStats(data = this._data) {
        let [complete, inProgress, pending, notes] = [0, 0, 0, 0];
        let totalTime = 0;

        Object.keys(data).forEach(id => {
            const item = data[id];
            if (item._isTask) {
                totalTime += +item.cumulativeTimeTaken;
                return item.isComplete ? complete++ : item.inProgress ? inProgress++ : pending++;
            }

            return notes++;
        });

        const total = complete + pending + inProgress;
        const percent = (total === 0) ? 0 : Math.floor(complete * 100 / total);

        return {percent, complete, inProgress, pending, notes, totalTime};
    }

    _hasTerms(string, terms) {
        for (const term of terms) {
            if (string.toLocaleLowerCase().indexOf(term.toLocaleLowerCase()) > -1) {
                return string;
            }
        }
    }

    _filterTask(data) {
        Object.keys(data).forEach(id => {
            if (!data[id]._isTask) {
                delete data[id];
            }
        });
        return data;
    }

    _filterStarred(data) {
        Object.keys(data).forEach(id => {
            if (!data[id].isStarred) {
                delete data[id];
            }
        });
        return data;
    }

    _filterBug(data) {
        Object.keys(data).forEach(id => {
            if (!data[id].isBug) {
                delete data[id];
            }
        });
        return data;
    }

    _filterInProgress(data) {
        Object.keys(data).forEach(id => {
            if (!data[id]._isTask || !data[id].inProgress) {
                delete data[id];
            }
        });
        return data;
    }

    _filterComplete(data) {
        Object.keys(data).forEach(id => {
            if (!data[id]._isTask || !data[id].isComplete) {
                delete data[id];
            }
        });
        return data;
    }

    _filterPending(data) {
        Object.keys(data).forEach(id => {
            if (!data[id]._isTask || data[id].isComplete) {
                delete data[id];
            }
        });
        return data;
    }

    _filterNote(data) {
        Object.keys(data).forEach(id => {
            if (data[id]._isTask) {
                delete data[id];
            }
        });
        return data;
    }

    _filterByAttributes(attr, data = this._data) {
        if (Object.keys(data).length === 0) {
            return data;
        }

        attr.forEach(x => {
            switch (x) {
                case 'star':
                case 'starred':
                    data = this._filterStarred(data);
                    break;

                case 'bug':
                case 'isBug':
                    data = this._filterBug(data);
                    break;

                case 'done':
                case 'checked':
                case 'complete':
                    data = this._filterComplete(data);
                    break;

                case 'progress':
                case 'started':
                case 'begun':
                    data = this._filterInProgress(data);
                    break;

                case 'pending':
                case 'unchecked':
                case 'incomplete':
                    data = this._filterPending(data);
                    break;

                case 'todo':
                case 'task':
                case 'tasks':
                    data = this._filterTask(data);
                    break;

                case 'note':
                case 'notes':
                    data = this._filterNote(data);
                    break;

                default:
                    break;
            }
        });
        const dateAttrIdentifier = 'date:';
        const dateAttr = attr.find(att => att.startsWith(dateAttrIdentifier));
        if (!!dateAttr) {
            const dateInput = this._convertDateStringInput(dateAttr.replace(dateAttrIdentifier, ''));
            data = this._filterByDate(data, dateInput);
        }
        return data;
    }

    _filterByDate(data, date) {
        return Object.keys(data)
            .filter(id => data[id].deadline === date)
            .map(id => data[id]);
    }

    _groupByBoard(data = this._data, boards = this._getBoards()) {
        const grouped = {};

        if (boards.length === 0) {
            boards = this._getBoards();
        }

        Object.keys(data).forEach(id => {
            const dataBoards = data[id].boards;
            boards.forEach(board => {
                if (dataBoards.includes(board)) {
                    if (Array.isArray(grouped[board])) {
                        return grouped[board].push(data[id]);
                    }
                    grouped[board] = [data[id]];
                }
            });
        });
        return grouped;
    }

    _groupByDate(data = this._data, dates = this._getCreationDates()) {
        const grouped = {};

        Object.keys(data).forEach(id => {
            dates.forEach(date => {
                if (data[id]._date === date) {
                    if (Array.isArray(grouped[date])) {
                        return grouped[date].push(data[id]);
                    }

                    grouped[date] = [data[id]];
                    return grouped[date];
                }
            });
        });

        return grouped;
    }

    _groupByDeadline(data = this._data, dates = this._getDeadlines()) {
        const grouped = {};

        Object.keys(data).forEach(id => {
            dates.forEach(date => {
                if (data[id].deadline === date) {
                    if (Array.isArray(grouped[date])) {
                        return grouped[date].push(data[id]);
                    }

                    grouped[date] = [data[id]];
                    return grouped[date];
                }
            });
        });

        return grouped;
    }

    _saveItemToArchive(item) {
        const {_archive} = this;
        const archiveID = this._generateID(_archive);

        item._id = archiveID;
        _archive[archiveID] = item;

        this._saveArchive(_archive);
    }

    _saveItemToStorage(item) {
        const {_data} = this;
        const restoreID = this._generateID();

        item._id = restoreID;
        _data[restoreID] = item;

        this._save(_data);
    }

    saveNewTaskbookDirectory(inputs) {
        this._storage.saveNewTaskbookDirectory(inputs.join());
    }

    createNote(desc) {
        const {id, description, boards, isBug} = this._getOptions(desc);
        const note = new Note({id, description, boards, isBug});
        const {_data} = this;
        _data[id] = note;
        this._save(_data);
        render.successCreate(note);
    }

    copyToClipboard(ids) {
        ids = this._validateIDs(ids);
        const {_data} = this;
        const descriptions = [];

        ids.forEach(id => descriptions.push(_data[id].description));

        clipboardy.writeSync(descriptions.join('\n'));
        render.successCopyToClipboard(ids);
    }

    checkTasks(ids) {
        ids = this._validateIDs(ids);
        const {_data} = this;
        const [checked, unchecked] = [[], []];
        ids.forEach(id => {
            if (_data[id]._isTask) {
                _data[id].isComplete = !_data[id].isComplete;
                return _data[id].isComplete ? checked.push(id) : unchecked.push(id);
            }
        });
        checked.forEach(id => _data[id].completionDate = new Date().toDateString());
        unchecked.forEach(id => _data[id].completionDate = undefined);
        this._save(_data);
        this._updateTimersByStartedAndPausedTasks([], checked);
        render.markComplete(checked);
        render.markIncomplete(unchecked);
    }

    beginTasks(ids) {
        ids = this._validateIDs(ids);
        const {_data} = this;
        const [started, paused] = [[], []];
        ids.forEach(id => {
            if (_data[id]._isTask) {
                _data[id].isComplete = false;
                return _data[id].inProgress ? paused.push(id) : started.push(id);
            }
        });
        this._updateTimersByStartedAndPausedTasks(started, paused);
        render.markStarted(started);
        render.markPaused(paused);
    }

    _updateTimersByStartedAndPausedTasks(started, paused) {
        const {_data} = this;
        started.forEach(id => {
            _data[id].inProgress = true;
            _data[id].isComplete = false;
            _data[id].inProgressActivationTime = new Date().getTime();
        });
        paused.forEach(id => {
            const task = _data[id];
            const cumulativeTimeTaken = task.cumulativeTimeTaken || 0;
            const inProgressActivationTime = task.inProgressActivationTime;
            const timeTakenToAdd = !!inProgressActivationTime ? new Date().getTime() - inProgressActivationTime : 0;
            _data[id].inProgress = false;
            _data[id].cumulativeTimeTaken = cumulativeTimeTaken + timeTakenToAdd;
            _data[id].inProgressActivationTime = undefined;
        });
        this._save(_data);
    }

    _getBoardsAndAttributes(terms) {
        let [boards, attributes, linkedBoards] = [[], [], []];
        const storedBoards = this._getBoards();

        terms.forEach(x => {
            if (x.includes('-@')) {
                const [firstBoard, secondBoard] = x.split('-');
                if (firstBoard.startsWith('@')) {
                    linkedBoards.push(firstBoard, secondBoard);
                }
            }
            if (storedBoards.indexOf(x) !== -1) {
                return boards.push(x);
            }
            if (storedBoards.indexOf(`@${x}`) === -1) {
                return x === 'myboard' ? boards.push('My Board') : attributes.push(x);
            }

            return boards.push(`@${x}`);
        });

        return [boards, attributes, linkedBoards].map(x => this._removeDuplicates(x));
    }

    _getGroupedByBoardAndFiltered(terms) {
        const boardsAndAttributes = this._getBoardsAndAttributes(terms);
        const boards = boardsAndAttributes[0];
        const attributes = boardsAndAttributes[1];
        const linkedBoards = boardsAndAttributes[2];
        const data = this._filterByAttributes(attributes);
        return this._groupByBoard(this._filterDataByLinkedBoards(data, linkedBoards), boards);
    }

    _filterDataByLinkedBoards(data, linkedBoards) {
        const idsFiltered = Object.keys(data)
            .filter(
                id => linkedBoards.every(linkedBoard => data[id].boards.some(board => board === linkedBoard))
            );
        return idsFiltered.map(id => data[id]);
    }

    createTask(desc) {
        const {boards, description, id, priority, isBug, deadline} = this._getOptions(desc);
        const task = new Task({id, description, boards, priority, isBug, deadline});
        const {_data} = this;
        _data[id] = task;
        this._save(_data);
        render.successCreate(task);
    }

    deleteItems(ids) {
        ids = this._validateIDs(ids);
        const {_data} = this;

        ids.forEach(id => {
            this._saveItemToArchive(_data[id]);
            delete _data[id];
        });

        this._save(_data);
        render.successDelete(ids);
    }

    displayArchive() {
        render.displayByDate(this._groupByDate(this._archive, this._getCreationDates(this._archive)));
        console.log('');
    }

    displayByBoard() {
        render.displayByBoard(this._groupByBoard());
    }

    displayByDate() {
        render.displayByDate(this._groupByDate());
    }

    displayByDeadLine() {
        render.displayByDate(this._groupByDeadline());
    }

    displayStats(data = this._data) {
        render.displayStats(this._getStats(data));
    }

    editDescription(input) {
        const targets = input.filter(x => x.startsWith('@'));

        if (targets.length === 0) {
            render.missingID();
            process.exit(1);
        }

        if (targets.length > 1) {
            render.invalidIDsNumber();
            process.exit(1);
        }

        const [target] = targets;
        const id = this._validateIDs(target.replace('@', ''));
        const newDesc = input.filter(x => x !== target).join(' ');

        if (newDesc.length === 0) {
            render.missingDesc();
            process.exit(1);
        }

        const {_data} = this;
        _data[id].description = newDesc;
        this._save(_data);
        render.successEdit(id);
    }

    findItems(terms) {
        const result = {};
        const {_data} = this;

        Object.keys(_data).forEach(id => {
            if (!this._hasTerms(_data[id].description, terms)) {
                return;
            }

            result[id] = _data[id];
        });

        render.displayByBoard(this._groupByBoard(result));
    }

    listByAttributes(terms) {
        render.displayByBoard(this._getGroupedByBoardAndFiltered(terms));
    }

    displayTable(terms) {
        const groupedByBoardAndFiltered = this._getGroupedByBoardAndFiltered(terms);
        const taskItemsToBeDisplayed = [];
        Object.keys(groupedByBoardAndFiltered).forEach(board => taskItemsToBeDisplayed.push(...groupedByBoardAndFiltered[board]));
        const uniqueTaskItemsToBeDisplayed = Array.from(new Set(taskItemsToBeDisplayed)).filter(item => item._isTask);
        const resultTableItems = uniqueTaskItemsToBeDisplayed.map(item => {
            const newTableItem = {
                'ID': item._id,
                'Boards': item.boards,
                'Description': item.description + (item.isBug ? '(BUG) ' : '')
            };
            if (!!item.cumulativeTimeTaken) {
                newTableItem['Time'] = render._getDurationFormatted(item.cumulativeTimeTaken)
            }
            if (!!item.deadline) {
                newTableItem['Deadline'] = item.deadline;
            }
            if (!!item.completionDate) {
                newTableItem['Completed'] = item.completionDate;
            }
            return newTableItem;
        });
        this._sortDataByTerms(terms, resultTableItems);
        this._displayTableWithStats(resultTableItems);
    }

    _displayTableWithStats(resultTableItems) {
        render.displayByTable(resultTableItems);
        this.displayStats(resultTableItems.map(resultItem => this._data[resultItem.ID]));
    }

    _sortDataByTerms(terms, data) {
        const sortIdentifier = 'sort:';
        const invertSortIdentifier = 'isort:';
        const sortCommand = terms.find(x => x.startsWith(sortIdentifier));
        const invertSortCommand = terms.find(x => x.startsWith(invertSortIdentifier));
        let sortColumn = '';
        let sortModifier;
        if (!!sortCommand) {
            sortColumn = sortCommand.replace(sortIdentifier, '');
            sortModifier = 1;
        }
        if (!!invertSortCommand) {
            sortColumn = invertSortCommand.replace(invertSortIdentifier, '');
            sortModifier = 0;
        }
        if (!sortColumn) {
            return;
        }
        switch (sortColumn) {
            case "ID":
                data.sort((a, b) => sortModifier === 1 ? a[sortColumn] - b[sortColumn] : b[sortColumn] - a[sortColumn]);
                break;
            case "Description":
                data.sort((a, b) => sortModifier === 1 ? a[sortColumn].localeCompare(b[sortColumn]) : b[sortColumn].localeCompare(a[sortColumn]));
                break;
            case "Boards":
                data.sort((a, b) => sortModifier === 1 ? this._compareArrayLengths(a[sortColumn], b[sortColumn]) : this._compareArrayLengths(b[sortColumn], a[sortColumn]));
                break;
            case "Deadline":
            case "Completed":
                data.sort((dateA, dateB) => sortModifier === 1 ? this._compareDates(dateA[sortColumn], dateB[sortColumn]) : this._compareDates(dateB[sortColumn], dateA[sortColumn]));
                break;
            case "Time":
                data.sort((timeA, timeB) => sortModifier === 1 ? this._compareDurations(timeA[sortColumn], timeB[sortColumn]) : this._compareDurations(timeB[sortColumn], timeA[sortColumn]));
                break;
        }
    }

    _compareDurations(durationA, durationB) {
        if (!durationA && !durationB) {
            return 0;
        }
        if (!durationA) {
            return 1;
        }
        if (!durationB) {
            return -1;
        }
        const splitDurationA = durationA.split(':');
        const splitDurationB = durationB.split(':');
        const lengthA = splitDurationA.length;
        const lengthB = splitDurationB.length;
        if (lengthA !== lengthB) {
            return lengthA - lengthB;
        }
        const hoursA = +splitDurationA[0];
        const hoursB = +splitDurationB[0];
        const minutesA = +splitDurationA[1];
        const minutesB = +splitDurationA[1];
        const secondsA = +splitDurationA[2];
        const secondsB = +splitDurationB[2];
        if (hoursA !== hoursB) {
            return hoursA - hoursB;
        }
        if (minutesA !== minutesB) {
            return minutesA - minutesB;
        }
        if (secondsA !== secondsB) {
            return secondsA - secondsB;
        }
    }

    _compareDates(dateA, dateB) {
        return new Date(dateA || 0).getTime() - new Date(dateB || 0).getTime();
    }

    _compareArrayLengths(arrayA, arrayB) {
        return arrayA.length - arrayB.length;
    }

    moveItemsToDate(input) {
        const targets = input.filter(x => x.startsWith('@'));
        const dateInputs = input.filter(x => !x.startsWith('@'));
        const ids = this._validateIDs(targets.map(target => target.replace('@', '')));
        if (ids.length === 0) {
            render.missingID();
            process.exit(1);
        }
        if (dateInputs.length === 0) {
            render.missingDate();
            process.exit(1);
        }
        const date = this._convertDateStringInput(dateInputs.shift());
        const {_data} = this;
        ids.forEach(id => {
            _data[id].deadline = date;
        });
        this._save(_data);
        render.successMoveToDate(date, ids);
    }

    addBoard(input) {
        const targets = input.filter(x => !x.startsWith('@'));
        const boards = input.filter(x => x.startsWith('@'));
        const ids = this._validateIDs(targets.map(target => target.replace('@', '')));
        if (ids.length === 0) {
            render.missingID();
            process.exit(1);
        }
        if (boards.length === 0) {
            render.missingBoards();
            process.exit(1);
        }
        const {_data} = this;
        ids.forEach(id => {
            _data[id].boards.push(
                ...boards.filter(board => _data[id].boards.every(itemBoard => itemBoard !== board))
            );
        });
        this._save(_data);
        render.successAddBoard(boards, ids);
    }

    removeBoard(input) {
        const targets = input.filter(x => !x.startsWith('@'));
        const boards = input.filter(x => x.startsWith('@'));
        const ids = this._validateIDs(targets.map(target => target.replace('@', '')));
        if (ids.length === 0) {
            render.missingID();
            process.exit(1);
        }
        if (boards.length === 0) {
            render.missingBoards();
            process.exit(1);
        }
        const {_data} = this;
        ids.forEach(id => {
            _data[id].boards = _data[id].boards.filter(itemBoard => boards.every(board => itemBoard !== board));
        });
        this._save(_data);
        render.successRemoveBoard(boards, ids);
    }

    _convertDateStringInput(dateString) {
        const parts = dateString.split('/');
        if (parts.length !== 3) {
            render.invalidDate();
            process.exit(1);
        }
        const myDate = new Date(+parts[0], parts[1] - 1, +parts[2]);
        return myDate.toDateString();
    }

    moveBoards(input) {
        let boards = [];
        const targets = input.filter(x => x.startsWith('@'));

        if (targets.length === 0) {
            render.missingID();
            process.exit(1);
        }

        if (targets.length > 1) {
            render.invalidIDsNumber();
            process.exit(1);
        }

        const [target] = targets;
        const id = this._validateIDs(target.replace('@', ''));

        input.filter(x => x !== target).forEach(x => {
            boards.push(x === 'myboard' ? 'My board' : `@${x}`);
        });

        if (boards.length === 0) {
            render.missingBoards();
            process.exit(1);
        }

        boards = this._removeDuplicates(boards);

        const {_data} = this;
        _data[id].boards = boards;
        this._save(_data);
        render.successMove(id, boards);
    }

    moveToToday(ids) {
        ids = this._validateIDs(ids);
        const currentDate = new Date();
        const {_data} = this;
        ids.forEach(id => {
            _data[id].deadline = currentDate.toDateString();
        });
        this._save(_data);
        render.successMoveToToday(ids);
    }

    resetDate(ids) {
        ids = this._validateIDs(ids);
        const {_data} = this;
        ids.forEach(id => {
            _data[id].deadline = _data[id]._date;
        });
        this._save(_data);
        render.successResetDate(ids);
    }

    clearTimer(ids) {
        ids = this._validateIDs(ids);
        const {_data} = this;
        ids.forEach(id => {
            _data[id].inProgressActivationTime = undefined;
        });
        this._save(_data);
        render.successClearTimer(ids);
    }

    clearTime(ids) {
        ids = this._validateIDs(ids);
        const {_data} = this;
        ids.forEach(id => {
            _data[id].cumulativeTimeTaken = 0;
        });
        this._save(_data);
        render.successClearTime(ids);
    }

    addTime(input) {
        const targets = input.filter(x => x.startsWith('@'));
        const time = input.filter(x => !x.startsWith('@')).reduce((acc, curr) => +acc + +curr);
        const ids = this._validateIDs(targets.map(target => target.replace('@', '')));
        if (ids.length === 0) {
            render.missingID();
            process.exit(1);
        }
        if (time === 0) {
            render.missingTimeValue();
            process.exit(1);
        }
        const {_data} = this;
        ids.forEach(id => {
            _data[id].cumulativeTimeTaken += time * 60000;
        });
        this._save(_data);
        render.successAddTime(time, ids);
    }

    removeTime(input) {
        const targets = input.filter(x => x.startsWith('@'));
        let time = input.filter(x => !x.startsWith('@')).reduce((acc, curr) => +acc + +curr);
        const ids = this._validateIDs(targets.map(target => target.replace('@', '')));
        if (ids.length === 0) {
            render.missingID();
            process.exit(1);
        }
        if (time === 0) {
            render.missingTimeValue();
            process.exit(1);
        }
        const {_data} = this;
        ids.forEach(id => {
            _data[id].cumulativeTimeTaken -= time * 60000;
            if (_data[id].cumulativeTimeTaken < 0) {
                time = +time + _data[id].cumulativeTimeTaken / 60000;
                _data[id].cumulativeTimeTaken = 0;
            }
        });
        this._save(_data);
        render.successRemoveTime(time, ids);
    }

    restoreItems(ids) {
        ids = this._validateIDs(ids, this._getIDs(this._archive));
        const {_archive} = this;

        ids.forEach(id => {
            this._saveItemToStorage(_archive[id]);
            delete _archive[id];
        });

        this._saveArchive(_archive);
        render.successRestore(ids);
    }

    starItems(ids) {
        ids = this._validateIDs(ids);
        const {_data} = this;
        const [starred, unstarred] = [[], []];

        ids.forEach(id => {
            _data[id].isStarred = !_data[id].isStarred;
            return _data[id].isStarred ? starred.push(id) : unstarred.push(id);
        });

        this._save(_data);
        render.markStarred(starred);
        render.markUnstarred(unstarred);
    }

    bugItems(ids) {
        ids = this._validateIDs(ids);
        const {_data} = this;
        const [bug, notBug] = [[], []];

        ids.forEach(id => {
            _data[id].isBug = !_data[id].isBug;
            return _data[id].isBug ? bug.push(id) : notBug.push(id);
        });

        this._save(_data);
        render.markBug(bug);
        render.markNotBug(notBug);
    }

    updatePriority(input) {
        const level = input.find(x => ['1', '2', '3'].indexOf(x) > -1);

        if (!level) {
            render.invalidPriority();
            process.exit(1);
        }

        const targets = input.filter(x => x.startsWith('@'));

        if (targets.length === 0) {
            render.missingID();
            process.exit(1);
        }

        const ids = this._validateIDs(targets.map(target => target.replace('@', '')));

        const {_data} = this;
        ids.forEach(id => {
            _data[id].priority = level;
        });
        this._save(_data);
        render.successPriority(ids, level);
    }

    clear() {
        const ids = [];
        const {_data} = this;

        Object.keys(_data).forEach(id => {
            if (_data[id].isComplete) {
                ids.push(id);
            }
        });

        if (ids.length === 0) {
            return;
        }

        this.deleteItems(ids);
    }

    save() {
        this._storage.pushOnline();
    }
}

module.exports = new Taskbook();
