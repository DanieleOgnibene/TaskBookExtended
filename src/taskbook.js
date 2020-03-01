#!/usr/bin/env node
'use strict';
const clipboardy = require('clipboardy');
const Task = require('./task');
const Note = require('./note');
const Storage = require('./storage');
const render = require('./render');
const chalk = require('chalk');

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

    _validateIDs(inputIDs, existingIDs = this._getIDs()) {
        if (inputIDs.length === 0) {
            render.missingID();
            process.exit(1);
        }

        inputIDs = this._removeDuplicates(inputIDs);

        inputIDs.forEach(id => {
            if (existingIDs.indexOf(id) === -1) {
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

    _isDeadlineOpt(x) {
        const dateIdentifier = 'deadline:';
        return x.startsWith(dateIdentifier);
    }

    _getBoards(data = {...this._data, ...this._archive}) {
        const boards = ['My Board'];
        Object.keys(data).forEach(id => {
            boards.push(...data[id].boards.filter(x => boards.indexOf(x) === -1));
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
        return Object.keys(data);
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
            .filter(x => this._isDeadlineOpt(x))
            .map(target => target.replace('deadline:', ''))
            .shift();
        return dateInput ? this._convertDateStringInput(dateInput) : undefined;
    }

    _getLink(desc) {
        const linkInput = desc
            .filter(x => this._isLinkOpt(x))
            .map(target => target.replace('link:', ''))
            .shift();
        return linkInput || undefined;
    }

    _isLinkOpt(opt) {
        return opt.includes('link:');
    }

    _getOptions(input) {
        const [boards, desc] = [[], []];
        if (input.length === 0) {
            render.missingDesc();
            process.exit(1);
        }
        const id = this._generateID(this._data);
        const priority = this._getPriority(input);
        const isBug = this._getIsBug(input);
        const deadline = this._getDeadline(input);
        const link = this._getLink(input);
        input.forEach(x => {
            if (!this._isPriorityOpt(x) && !this._isBugOpt(x) && !this._isDeadlineOpt(x)) {
                return x.startsWith('@') && x.length > 1 ? boards.push(x) : desc.push(x);
            }
        });
        const description = desc.join(' ');
        if (boards.length === 0) {
            boards.push('My board');
        }
        boards.sort((a, b) => a.localeCompare(b));
        return {boards, description, id, priority, isBug, deadline, link};
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
        const deadlineAttrIdentifier = 'deadline:';
        const creationAttrIdentifier = 'creation:';
        const deadlineDates = attr.find(att => att.startsWith(deadlineAttrIdentifier));
        const creationDates = attr.find(att => att.startsWith(creationAttrIdentifier));
        if (!!deadlineDates) {
            const dates = deadlineDates.replace(deadlineAttrIdentifier, '');
            const datesSplit = dates.split('-');
            return this._getDataFilteredByDates(data, datesSplit, 'deadline');
        }
        if (!!creationDates) {
            const dates = creationDates.replace(creationAttrIdentifier, '');
            const datesSplit = dates.split('-');
            return this._getDataFilteredByDates(data, datesSplit, '_date');
        }
        return data;
    }

    _getDataFilteredByDates(data, datesSplit, dataItemKey) {
        if (datesSplit.length === 1) {
            const dateInput = this._convertDateStringInput(datesSplit[0]);
            return this._filterByDate(data, dateInput, dataItemKey);
        }
        return this._filterByPeriod(data, datesSplit, dataItemKey);
    }

    _filterByPeriod(data, dates, itemPropertyKey) {
        const times = dates.map(date => new Date(this._convertDateStringInput(date)).getTime());
        times.sort((a, b) => a - b);
        return Object.keys(data)
            .filter(id => {
                const item = data[id];
                const deadlineTime = new Date(item[itemPropertyKey]).getTime();
                return deadlineTime >= times[0] && deadlineTime <= times[1];
            })
            .map(id => data[id]);
    }

    _filterByDate(data, date, itemPropertyKey) {
        return Object.keys(data)
            .filter(id => data[id][itemPropertyKey] === date)
            .map(id => data[id]);
    }

    _groupByBoard(data = this._data, activeBoards = this._getBoards(data)) {
        if (activeBoards.length === 0) {
            activeBoards = this._getBoards(data);
        }
        const grouped = {};
        activeBoards.forEach(activeBoard => {
            grouped[activeBoard] = Object.keys(data)
                .filter(id => data[id].boards.includes(activeBoard)).map(id => data[id]);
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
                    date = !!date ? date : 'No deadline';
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
        item._id = 'a-' + this._generateID(_archive);
        _archive[item._id] = item;
        this._saveArchive(_archive);
    }

    _saveItemToStorage(item) {
        const {_data} = this;
        item._id = this._generateID(_data);
        _data[item._id] = item;
        this._save(_data);
    }

    _generateID(data) {
        const currentIds = Object.keys(data);
        return this._getFirstNewFreeId(currentIds);
    }

    _getFirstNewFreeId(currentIds) {
        const archiveIdIdentifier = 'a-';
        const normalizedCurrentIds = currentIds
            .map(
                currentId => (currentId + '').includes(archiveIdIdentifier) ?
                    +currentId.replace(archiveIdIdentifier, '') :
                    +currentId
            );
        const maxId = Math.max(...normalizedCurrentIds);
        const idPool = Array.from(new Array(maxId).keys()).map(key => key + 1);
        const firstFreeId = idPool.find(id => !normalizedCurrentIds.includes(id));
        return (firstFreeId || maxId + 1).toString();
    }

    saveNewTaskbookDirectory(inputs) {
        this._storage.saveNewTaskbookDirectory(inputs.join());
    }

    createNote(desc) {
        const {id, description, boards, isBug, link} = this._getOptions(desc);
        const note = new Note({id, description, boards, isBug, link});
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
        const notTasks = [];
        ids.forEach(id => {
            if (_data[id]._isTask) {
                _data[id].isComplete = !_data[id].isComplete;
                return _data[id].isComplete ? checked.push(id) : unchecked.push(id);
            }
            notTasks.push(id);
        });
        checked.forEach(id => _data[id].completionDate = new Date().toDateString());
        unchecked.forEach(id => _data[id].completionDate = undefined);
        this._save(_data);
        this._updateTimersByStartedAndPausedTasks([], checked);
        render.markComplete(checked);
        render.markIncomplete(unchecked);
        if (notTasks.length > 0) {
            render.notTasks(notTasks);
        }
    }

    beginTasks(ids) {
        ids = this._validateIDs(ids);
        const {_data} = this;
        const [started, paused] = [[], []];
        const notTasks = [];
        ids.forEach(id => {
            if (_data[id]._isTask) {
                _data[id].isComplete = false;
                return _data[id].inProgress ? paused.push(id) : started.push(id);
            }
            notTasks.push(id);
        });
        this._updateTimersByStartedAndPausedTasks(started, paused);
        render.markStarted(started);
        render.markPaused(paused);
        if (notTasks.length > 0) {
            render.notTasks(notTasks);
        }
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
        terms.forEach(x => {
            const splitLinkedBoards = x.split('-');
            if (splitLinkedBoards.every(linkedBoard => this._isAValidBoard(linkedBoard))) {
                return splitLinkedBoards.length > 1 ? linkedBoards.push(...splitLinkedBoards) : boards.push(x);
            }
            if (!this._isAValidBoard(`@${x}`)) {
                return x === 'myboard' ? boards.push('My Board') : attributes.push(x);
            }

            return boards.push(`@${x}`);
        });
        return [boards, attributes, linkedBoards].map(x => this._removeDuplicates(x));
    }

    _isAValidBoard(board) {
        return this._getBoards().indexOf(board) !== -1;
    }

    _getGroupedByBoardAndFiltered(terms, dataToUse) {
        const boardsAndAttributes = this._getBoardsAndAttributes(terms);
        const boards = boardsAndAttributes[0];
        const attributes = boardsAndAttributes[1];
        const linkedBoards = boardsAndAttributes[2];
        const data = this._filterByAttributes(
            attributes,
            dataToUse || this._getAskedDataByTerms(terms)
        );
        const boardsToGroup = [...boards];
        boardsToGroup.push(...linkedBoards);
        const filteredData = this._filterDataByLinkedBoardsAndBoards(data, linkedBoards, boards);
        return {
            filteredData,
            groupByBoard: this._groupByBoard(
                filteredData,
                Array.from(new Set(boardsToGroup))
            )
        };
    }

    _getAskedDataByTerms(terms) {
        const dataIdentifier = 'data:';
        const dataOption = terms.find(term => term.includes(dataIdentifier));
        if (!!dataOption) {
            let dataName = dataOption.replace(dataIdentifier, '');
            dataName.toLowerCase();
            switch (dataName) {
                case 'archive':
                    return this._archive;
                case 'all':
                    return {
                        ...this._data,
                        ...this._archive
                    };
                case 'current':
                    return this._data;
                default:
                    render.invalidDataOption();
                    process.exit(1);
                    break;
            }
        }
        return this._data;
    }

    _filterDataByLinkedBoardsAndBoards(data, linkedBoards, boards) {
        if (linkedBoards.length === 0 && boards.length === 0) {
            return data;
        }
        const idsFiltered = Object.keys(data)
            .filter(id => {
                const itemBoards = data[id].boards;
                return linkedBoards.length > 0 &&
                    linkedBoards.every(linkedBoard => itemBoards.includes(linkedBoard)) ||
                    itemBoards.some(itemBoard => boards.includes(itemBoard));
            });
        return idsFiltered.map(id => data[id]);
    }

    createTask(desc) {
        const {boards, description, id, priority, isBug, deadline, link} = this._getOptions(desc);
        const task = new Task({id, description, boards, priority, isBug, deadline, link});
        const {_data} = this;
        _data[id] = task;
        this._save(_data);
        render.successCreate(task);
    }

    deleteItems(ids) {
        const {_data} = this;
        ids = this._validateIDs(ids);
        ids.forEach(id => {
            this._saveItemToArchive(_data[id]);
            delete _data[id];
        });
        this._save(_data);
        render.successDelete(ids);
    }

    hardDeleteItems(ids) {
        const {_data} = this;
        const {_archive} = this;
        ids = this._validateIDs(ids, this._getIDs({..._data, ..._archive}));
        render.askConfirmation(
            render.hardDeleteConfirmationMessage(ids),
            (err, result) => {
                const confirmation = result.confirm.toLowerCase();
                if (confirmation !== 'y' && confirmation !== 'yes') {
                    return;
                }
                ids.forEach(id => {
                    !!_data[id] ?
                        delete _data[id] :
                        delete _archive[id];
                });
                this._save(_data);
                this._saveArchive(_archive);
                render.successHardDelete(ids);
            }
        );
    }

    displayArchive(input) {
        const {filteredData} = this._getGroupedByBoardAndFiltered(input, this._archive);
        render.displayByDate(this._groupByDate(filteredData, this._getCreationDates(filteredData)));
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
        this.displayStats(result);
    }

    listByAttributes(terms) {
        const {groupByBoard, filteredData} = this._getGroupedByBoardAndFiltered(terms);
        render.displayByBoard(groupByBoard);
        this.displayStats(filteredData);
    }

    displayTable(terms) {
        const {groupByBoard} = this._getGroupedByBoardAndFiltered(terms);
        const taskItemsToBeDisplayed = [];
        Object.keys(groupByBoard).forEach(board => taskItemsToBeDisplayed.push(...groupByBoard[board]));
        const uniqueTaskItemsToBeDisplayed = Array.from(new Set(taskItemsToBeDisplayed)).filter(item => item._isTask);
        const resultTableItems = uniqueTaskItemsToBeDisplayed.map(item => {
            const newTableItem = {
                'ID': item._id,
                'Boards': item.boards.join('·'),
                'Description': (item.isBug ? '(BUG) ' : '') + item.description
            };
            if (!!item.cumulativeTimeTaken) {
                const currentTimer = item.inProgressActivationTime ? new Date().getTime() - item.inProgressActivationTime : 0;
                const time = render._getDurationFormatted(item.cumulativeTimeTaken + currentTimer);
                newTableItem['Time'] = currentTimer ? `·${time}·` : time
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
        if (resultTableItems.length === 0) {
            render.noDataToDisplay();
            process.exit(1);
        }
        render.displayByTable(resultTableItems);
        this.displayStats(resultTableItems.map(resultItem => this._data[resultItem.ID] || this._archive[resultItem.ID]));
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
        sortColumn = sortColumn.toLowerCase();
        switch (sortColumn) {
            case "id": {
                const key = 'ID';
                data.sort((a, b) => sortModifier === 1 ? a[key] - b[key] : b[key] - a[key]);
                break;
            }
            case "description": {
                const key = 'Description';
                data.sort((a, b) => sortModifier === 1 ? a[key].localeCompare(b[key]) : b[key].localeCompare(a[key]));
                break;
            }
            case "boards": {
                const key = 'Boards';
                data.sort((a, b) => sortModifier === 1 ? this._compareArrayLengths(a[key], b[key]) : this._compareArrayLengths(b[key], a[key]));
                break;
            }
            case "deadline":
                data.sort(this._dataSortFnByDate(data, 'Deadline'), sortModifier);
                break;
            case "completed":
                data.sort(this._dataSortFnByDate(data, 'Completed'), sortModifier);
                break;
            case "time": {
                const key = 'Time';
                data.sort((timeA, timeB) => sortModifier === 1 ? this._compareDurations(timeA[key], timeB[key]) : this._compareDurations(timeB[key], timeA[key]));
                break;
            }
        }
    }

    _dataSortFnByDate(data, key, sortModifier) {
        return (dateA, dateB) =>
            sortModifier === 1 ? this._compareDates(dateA[key], dateB[key]) : this._compareDates(dateB[key], dateA[key]);
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
            _data[id].boards.sort((a, b) => a.localeCompare(b));
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

    removeDeadline(targets) {
        const ids = this._validateIDs(targets);
        if (ids.length === 0) {
            render.missingID();
            process.exit(1);
        }
        const {_data} = this;
        ids.forEach(id => {
            _data[id].deadline = undefined;
        });
        this._save(_data);
        render.successRemoveDeadline(ids);
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

    setLink(input) {
        const targets = input.filter(x => x.startsWith('@'));
        const link = input.filter(x => !x.startsWith('@')).join();
        const ids = this._validateIDs(targets.map(target => target.replace('@', '')));
        if (ids.length === 0) {
            render.missingID();
            process.exit(1);
        }
        const {_data} = this;
        ids.forEach(id => {
            _data[id].link = link;
        });
        this._save(_data);
        render.successSetLink(ids, link);
    }

    removeLink(input) {
        const ids = this._validateIDs(input);
        if (ids.length === 0) {
            render.missingID();
            process.exit(1);
        }
        const {_data} = this;
        ids.forEach(id => {
            _data[id].link = '';
        });
        this._save(_data);
        render.successRemoveLink(ids);
    }

    displayLink(input) {
        const ids = this._validateIDs(input);
        if (ids.length === 0) {
            render.missingID();
            process.exit(1);
        }
        console.log('\n');
        ids.forEach(id => {
            render.displayLink(this._data[id]);
        });
        console.log('\n');
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

    pushOnline() {
        this._storage.pushOnline();
    }
}

module.exports = new Taskbook();
