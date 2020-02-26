'use strict';
const Item = require('./item');

class Task extends Item {
    constructor(options = {}) {
        super(options);
        this._isTask = true;
        this.isComplete = options.isComplete || false;
        this.inProgress = options.inProgress || false;
        this.inProgressActivationTime = options.inProgressActivationTime;
        this.comulativeTimeTaken = options.comulativeTimeTaken || this.comulativeTimeTaken;
        this.isStarred = options.isStarred || false;
        this.priority = options.priority || 1;
    }
}

module.exports = Task;
