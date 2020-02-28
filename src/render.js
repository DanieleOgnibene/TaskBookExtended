'use strict';
const chalk = require('chalk');
const signale = require('signale');
const config = require('./config');

signale.config({displayLabel: false});

const {await: wait, error, log, note, pending, success} = signale;
const {blueBright: blue, greenBright: green, grey, magentaBright: magenta, redBright: red, underline, yellowBright: yellow} = chalk;

const priorities = {2: 'yellow', 3: 'red'};

class Render {
    get _configuration() {
        return config.get();
    }

    _colorBoards(boards) {
        const formattedBoards = boards.map(x => grey(x));
        if (formattedBoards.length > 0) {
            formattedBoards.unshift(' Boards:');
        }
        return formattedBoards.join(' ');
    }

    _isBoardComplete(items) {
        const {tasks, complete, notes} = this._getItemStats(items);
        return tasks === complete && notes === 0;
    }

    _getAge(birthday) {
        const daytime = 24 * 60 * 60 * 1000;
        const age = Math.round(Math.abs((birthday - Date.now()) / daytime));
        return (age === 0) ? '' : ` Age: ${grey(age + 'd')}`;
    }

    _getCorrelation(items) {
        const {tasks, complete} = this._getItemStats(items);
        return grey(`[${complete}/${tasks}]`);
    }

    _getItemStats(items) {
        let [tasks, complete, notes] = [0, 0, 0];

        items.forEach(item => {
            if (item._isTask) {
                tasks++;
                if (item.isComplete) {
                    return complete++;
                }
            }

            return notes++;
        });

        return {tasks, complete, notes};
    }

    _getCumulativeTimeTaken(item) {
        const cumulativeTimeTaken = item.cumulativeTimeTaken;
        return !!cumulativeTimeTaken ? ` Total: ${grey(this._getDurationFormatted(cumulativeTimeTaken))}` : '';
    }

    _getCurrentActiveTimeTaken(item) {
        const inProgressActivationTime = item.inProgressActivationTime;
        return !!inProgressActivationTime ?
            ` Timer: ${grey(this._getDurationFormatted(new Date().getTime() - inProgressActivationTime))}` :
            '';
    }

    _getDurationFormatted(millisecondsNumber) {
        const sec_num = millisecondsNumber / 1000;
        let hours = Math.floor(sec_num / 3600);
        let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        let seconds = Math.floor(sec_num - (hours * 3600) - (minutes * 60));

        if (hours < 10) {
            hours = "0" + hours;
        }
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        if (seconds < 10) {
            seconds = "0" + seconds;
        }
        return hours + ':' + minutes + ':' + seconds;
    }

    _getStar(item) {
        return item.isStarred ? yellow(' ★') : '';
    }

    _getBug(item) {
        return item.isBug ? red('(BUG)') : '';
    }

    _buildTitle(key, items) {
        const title = (key === new Date().toDateString()) ? `${underline(key)} ${grey('[Today]')}` : underline(key);
        const correlation = this._getCorrelation(items);
        return {title, correlation};
    }

    _buildPrefix(item) {
        const prefix = [];

        const {_id} = item;
        prefix.push(' '.repeat(4 - String(_id).length));
        prefix.push(grey(`${_id}.`));

        return prefix.join(' ');
    }

    _buildMessage(item) {
        const message = [];

        const {isComplete, description} = item;
        const priority = parseInt(item.priority, 10);

        if (!isComplete && priority > 1) {
            message.push(underline[priorities[priority]](description));
        } else {
            message.push(isComplete ? grey(description) : description);
        }

        if (!isComplete && priority > 1) {
            message.push(priority === 2 ? yellow('(!)') : red('(!!)'));
        }

        message.push(this._getBug(item));
        return message.join(' ');
    }

    _displayTitle(board, items) {
        const {title: message, correlation: suffix} = this._buildTitle(board, items);
        const titleObj = {prefix: '\n ', message, suffix};

        return log(titleObj);
    }

    _displayItemByBoard(item) {
        const {_isTask, isComplete, inProgress} = item;
        const age = this._getAge(item._timestamp);
        const star = this._getStar(item);
        const currentTimer = this._getCurrentActiveTimeTaken(item);
        const cumulativeTimeTaken = this._getCumulativeTimeTaken(item);

        const prefix = this._buildPrefix(item);
        const message = this._buildMessage(item);
        let suffix = `${age.length === 0 ? age : ''}${currentTimer}${cumulativeTimeTaken}`;
        if (suffix.length > 0) {
            suffix = `${green(' {')}${suffix}${green(' }')}`
        }
        suffix = `${star}${suffix}`;
        if (isComplete) {
            suffix = grey(suffix);
        }
        const msgObj = {prefix, message, suffix};
        if (_isTask) {
            return isComplete ? success(msgObj) : inProgress ? wait(msgObj) : pending(msgObj);
        }
        return note(msgObj);
    }

    _displayItemByDate(item) {
        const {_isTask, isComplete, inProgress} = item;
        const boards = item.boards.filter(x => x !== 'Main board');
        const star = this._getStar(item);
        const currentTimer = this._getCurrentActiveTimeTaken(item);
        const cumulativeTimeTaken = this._getCumulativeTimeTaken(item);

        const prefix = this._buildPrefix(item);
        const message = this._buildMessage(item);
        let suffix = `${currentTimer}${cumulativeTimeTaken}${this._colorBoards(boards)}`;
        if (suffix.length > 0) {
            suffix = `${green(' {')}${suffix}${green(' }')}`
        }
        suffix = `${star}${suffix}`;
        if (isComplete) {
            suffix = grey(suffix);
        }
        const msgObj = {prefix, message, suffix};
        if (_isTask) {
            return isComplete ? success(msgObj) : inProgress ? wait(msgObj) : pending(msgObj);
        }
        return note(msgObj);
    }

    displayByBoard(data) {
        Object.keys(data).forEach(board => {
            if (this._isBoardComplete(data[board]) && !this._configuration.displayCompleteTasks) {
                return;
            }

            this._displayTitle(board, data[board]);
            data[board].forEach(item => {
                if (item._isTask && item.isComplete && !this._configuration.displayCompleteTasks) {
                    return;
                }

                this._displayItemByBoard(item);
            });
        });
    }

    displayByDate(data) {
        const orderedDates = this._getOrderedDates(Object.keys(data));
        orderedDates.forEach(date => {
            if (this._isBoardComplete(data[date]) && !this._configuration.displayCompleteTasks) {
                return;
            }
            this._displayTitle(date, data[date]);
            data[date].forEach(item => {
                if (item._isTask && item.isComplete && !this._configuration.displayCompleteTasks) {
                    return;
                }
                this._displayItemByDate(item);
            });
        });
    }

    _getOrderedDates(dates) {
        return dates
            .sort(
                (firstDate, secondDate) =>
                    new Date(firstDate).getTime() - new Date(secondDate).getTime()
            );
    }

    displayStats({percent, complete, inProgress, pending, notes, totalTime}) {
        if (!this._configuration.displayProgressOverview) {
            return;
        }

        percent = percent >= 75 ? green(`${percent}%`) : percent >= 50 ? yellow(`${percent}%`) : `${percent}%`;

        const status = [
            `${magenta(pending)} ${grey('pending')}`,
            `${blue(inProgress)} ${grey('in-progress')}`,
            `${green(complete)} ${grey('done')}`,
            `${blue(notes)} ${grey(notes === 1 ? 'note' : 'notes')}`
        ];

        if (complete !== 0 && inProgress === 0 && pending === 0 && notes === 0) {
            log({prefix: '\n ', message: 'All done!', suffix: yellow('★')});
        }

        if (pending + inProgress + complete + notes === 0) {
            log({prefix: '\n ', message: 'Type `tb --help` to get started!', suffix: yellow('★')});
        }

        log({
            prefix: '\n ',
            message: `${percent} ${grey('of all tasks complete')}`,
            suffix: `${totalTime > 0 ? `${grey('· Total time ')}${magenta(this._getDurationFormatted(totalTime))}` : ''}`
        });
        log({prefix: ' ', message: status.join(grey(' · ')), suffix: '\n'});
    }

    displayByTable(items) {
        console.log('\n');
        console.table(items);
    }

    errorMessage(errorMessage) {
        const [prefix, suffix] = ['\n', '\n'];
        const message = `Error: ${red(errorMessage)}`;
        error({prefix, message, suffix});
    }

    successSaveData() {
        const [prefix, suffix] = ['\n', '\n'];
        const message = `Saved!`;
        success({prefix, message, suffix});
    }

    savingData() {
        const [prefix, suffix] = ['\n', '\n'];
        const message = `Saving...`;
        wait({prefix, message, suffix});
    }

    invalidCustomAppDir(path) {
        const [prefix, suffix] = ['\n', '\n'];
        const message = `No directory found at ${red(path)}, a new one will be created when needed.`;
        wait({prefix, message, suffix});
    }

    savedCustomAppDir() {
        const [prefix, suffix] = ['\n', '\n'];
        const message = `New directory path set!`;
        success({prefix, message, suffix});
    }

    invalidID(id) {
        const [prefix, suffix] = ['\n', grey(id) + '\n'];
        const message = 'Unable to find item with id:';
        error({prefix, message, suffix});
    }

    invalidIDsNumber() {
        const prefix = '\n';
        const message = 'More than one ids were given as input' + '\n';
        error({prefix, message});
    }

    invalidPriority() {
        const prefix = '\n';
        const message = 'Priority can only be 1, 2 or 3' + '\n';
        error({prefix, message});
    }

    invalidDataOption() {
        const prefix = '\n';
        const message = 'Data option can only be "current", "archive" or "all"' + '\n';
        error({prefix, message});
    }

    noDataToDisplay() {
        const prefix = '\n';
        const message = 'No data to display, try to use less filters!' + '\n';
        error({prefix, message});
    }

    markComplete(ids) {
        if (ids.length === 0) {
            return;
        }

        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        const message = `Checked ${ids.length > 1 ? 'tasks' : 'task'}:`;
        success({prefix, message, suffix});
    }

    markIncomplete(ids) {
        if (ids.length === 0) {
            return;
        }

        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        const message = `Unchecked ${ids.length > 1 ? 'tasks' : 'task'}:`;
        success({prefix, message, suffix});
    }

    markStarted(ids) {
        if (ids.length === 0) {
            return;
        }

        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        const message = `Started ${ids.length > 1 ? 'tasks' : 'task'}:`;
        success({prefix, message, suffix});
    }

    markPaused(ids) {
        if (ids.length === 0) {
            return;
        }

        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        const message = `Paused ${ids.length > 1 ? 'tasks' : 'task'}:`;
        success({prefix, message, suffix});
    }

    markStarred(ids) {
        if (ids.length === 0) {
            return;
        }

        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        const message = `Starred ${ids.length > 1 ? 'items' : 'item'}:`;
        success({prefix, message, suffix});
    }

    markBug(ids) {
        if (ids.length === 0) {
            return;
        }

        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        const message = `Set ${ids.length > 1 ? 'items' : 'item'} as ${ids.length > 1 ? 'bugs' : 'bug'}:`;
        success({prefix, message, suffix});
    }

    markNotBug(ids) {
        if (ids.length === 0) {
            return;
        }

        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        const message = `Set ${ids.length > 1 ? 'items' : 'item'} as not ${ids.length > 1 ? 'bugs' : 'bug'}:`;
        success({prefix, message, suffix});
    }

    markUnstarred(ids) {
        if (ids.length === 0) {
            return;
        }

        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        const message = `Unstarred ${ids.length > 1 ? 'items' : 'item'}:`;
        success({prefix, message, suffix});
    }

    missingBoards() {
        const prefix = '\n';
        const message = 'No boards were given as input';
        const suffix = '\n';
        error({prefix, message, suffix});
    }

    missingTimeValue() {
        const prefix = '\n';
        const message = 'No time value (minutes) was given as input';
        const suffix = '\n';
        error({prefix, message, suffix});
    }

    missingDate() {
        const prefix = '\n';
        const message = 'No date was given as input';
        const suffix = '\n';
        error({prefix, message, suffix});
    }

    invalidDate() {
        const prefix = '\n';
        const message = 'An invalid date was given as input';
        const suffix = '\n';
        error({prefix, message, suffix});
    }

    missingDesc() {
        const prefix = '\n';
        const message = 'No description was given as input';
        const suffix = '\n';
        error({prefix, message, suffix});
    }

    missingID() {
        const prefix = '\n';
        const message = 'No id was given as input';
        const suffix = '\n';
        error({prefix, message, suffix});
    }

    successCreate({_id, _isTask}) {
        const [prefix, suffix] = ['\n', grey(_id) + '\n'];
        const message = `Created ${_isTask ? 'task:' : 'note:'}`;
        success({prefix, message, suffix});
    }

    successEdit(id) {
        const [prefix, suffix] = ['\n', grey(id) + '\n'];
        const message = 'Updated description of item:';
        success({prefix, message, suffix});
    }

    successDelete(ids) {
        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        const message = `Deleted ${ids.length > 1 ? 'items' : 'item'}:`;
        success({prefix, message, suffix});
    }

    successMove(id, boards) {
        const [prefix, suffix] = ['\n', grey(boards.join(', ')) + '\n'];
        const message = `Move item: ${grey(id)} to`;
        success({prefix, message, suffix});
    }

    successPriority(ids, level) {
        const prefix = '\n';
        const message = `Updated priority of ${ids.length > 1 ? 'ids' : 'id'}: ${grey(ids.join(', '))} to`;
        let suffix = level === '3' ? red('high') : (level === '2' ? yellow('medium') : green('normal'));
        suffix += '\n';
        success({prefix, message, suffix});
    }

    successRestore(ids) {
        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        const message = `Restored ${ids.length > 1 ? 'items' : 'item'}:`;
        success({prefix, message, suffix});
    }

    successMoveToToday(ids) {
        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        const message = `${ids.length > 1 ? 'Items' : 'Item'} moved to today:`;
        success({prefix, message, suffix});
    }

    successMoveToDate(date, ids) {
        const [prefix, suffix] = ['\n', '\n'];
        const message = `${ids.length > 1 ? 'Items' : 'Item'} with ${ids.length > 1 ? 'ids' : 'id'} ${grey(ids.join(', '))} moved to date ${grey(date)}`;
        success({prefix, message, suffix});
    }

    successAddBoard(boards, ids) {
        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        const message = `${grey(boards.join(', '))} ${boards.length > 1 ? 'boards' : 'board'} added to ${ids.length > 1 ? 'items' : 'item'}`;
        success({prefix, message, suffix});
    }

    successRemoveBoard(boards, ids) {
        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        let message = `${grey(boards.join(', '))} ${boards.length > 1 ? 'boards' : 'board'} removed from ${ids.length > 1 ? 'items' : 'item'}`;
        success({prefix, message, suffix});
    }

    successAddTime(time, ids) {
        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        let message = `${grey(time)} minutes added to ${ids.length > 1 ? 'items' : 'item'}`;
        success({prefix, message, suffix});
    }

    successRemoveTime(time, ids) {
        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        let message = `${grey(time)} minutes removed to ${ids.length > 1 ? 'items' : 'item'}`;
        success({prefix, message, suffix});
    }

    successResetDate(ids) {
        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        let message = `${ids.length > 1 ? 'Items' : 'Item'} moved to creation date:`;
        success({prefix, message, suffix});
    }

    successClearTimer(ids) {
        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        let message = `Cleared timer of ${ids.length > 1 ? 'items' : 'item'}:`;
        success({prefix, message, suffix});
    }

    successClearTime(ids) {
        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        let message = `Cleared total time from ${ids.length > 1 ? 'items' : 'item'}:`;
        success({prefix, message, suffix});
    }

    successCopyToClipboard(ids) {
        const [prefix, suffix] = ['\n', grey(ids.join(', ')) + '\n'];
        let message = `Copied the ${ids.length > 1 ? 'descriptions of items' : 'description of item'}:`;
        success({prefix, message, suffix});
    }
}

module.exports = new Render();
