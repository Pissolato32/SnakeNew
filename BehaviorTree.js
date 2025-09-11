const NodeState = {
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
    RUNNING: 'RUNNING'
};

// Base class for all nodes
class Node {
    constructor() {
        if (this.constructor === Node) {
            throw new TypeError('Abstract class "Node" cannot be instantiated directly.');
        }
    }

    // The tick method is called on each frame. It should be overridden by subclasses.
    // It takes a 'context' object which is the entity being controlled (our bot).
    tick(context) {
        throw new Error('Method "tick()" must be implemented.');
    }
}

// --- Composite Nodes (have one or more children) ---

class Composite extends Node {
    constructor(children = []) {
        super();
        if (this.constructor === Composite) {
            throw new TypeError('Abstract class "Composite" cannot be instantiated directly.');
        }
        this.children = children;
    }

    addChild(node) {
        this.children.push(node);
    }
}

class Sequence extends Composite {
    constructor(children = []) {
        super(children);
    }

    // Runs children in order. Succeeds if all children succeed.
    // Fails as soon as one child fails.
    tick(context) {
        for (const child of this.children) {
            const childState = child.tick(context);
            if (childState === NodeState.FAILURE) {
                return NodeState.FAILURE;
            }
            if (childState === NodeState.RUNNING) {
                return NodeState.RUNNING;
            }
        }
        return NodeState.SUCCESS;
    }
}

class Selector extends Composite {
    constructor(children = []) {
        super(children);
    }

    // Runs children in order. Succeeds as soon as one child succeeds.
    // Fails if all children fail.
    tick(context) {
        for (const child of this.children) {
            const childState = child.tick(context);
            if (childState === NodeState.SUCCESS) {
                return NodeState.SUCCESS;
            }
            if (childState === NodeState.RUNNING) {
                return NodeState.RUNNING;
            }
        }
        return NodeState.FAILURE;
    }
}

// --- Leaf Nodes (have no children, perform the actual work) ---

class Action extends Node {
    constructor(actionFn) {
        super();
        if (typeof actionFn !== 'function') {
            throw new TypeError('Action requires a function to be executed.');
        }
        this.actionFn = actionFn;
    }

    // Executes the provided function. The function should return a NodeState.
    tick(context) {
        return this.actionFn(context);
    }
}

class Condition extends Node {
    constructor(conditionFn) {
        super();
        if (typeof conditionFn !== 'function') {
            throw new TypeError('Condition requires a function to be executed.');
        }
        this.conditionFn = conditionFn;
    }

    // Executes the provided function. Returns SUCCESS if the function returns true, FAILURE otherwise.
    tick(context) {
        return this.conditionFn(context) ? NodeState.SUCCESS : NodeState.FAILURE;
    }
}

module.exports = {
    NodeState,
    Sequence,
    Selector,
    Action,
    Condition
};