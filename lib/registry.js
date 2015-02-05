// Copyright 2014, Renasar Technologies Inc.
/* jshint: node:true */
'use strict';

var di = require('di');

module.exports = factory;
di.annotate(factory, new di.Provide('TaskGraph.Registry'));
di.annotate(factory,
    new di.Inject(
        'Assert',
        '_'
    )
);

/**
 * Injectable wrapper for dependencies
 */
function factory(assert, _) {
    var graphLibraryStore = new Store(_);
    var taskLibraryStore = new Store(_);
    var runningGraphStore = new Store(_);
    var graphTargetStore = new Store(_);

    return {
        registerTask: function(task) {
            assert.object(task);
            assert.object(task.definition);
            assert.string(task.definition.injectableName);
            assert.func(task.create);

            taskLibraryStore.put(task.definition.injectableName, task);
        },
        registerGraph: function(graph) {
            assert.object(graph);
            assert.object(graph.definition);
            assert.string(graph.definition.injectableName);
            assert.func(graph.create);

            graphLibraryStore.put(graph.definition.injectableName, graph);
        },
        fetchTaskCatalog: function(){
            return _.map(taskLibraryStore.getAll(), function(task) {
                return task.definition;
            });
        },
        fetchGraphCatalog: function(){
            return _.map(graphLibraryStore.getAll(), function(graph) {
                return graph.definition;
            });
        },
        fetchTask: function(taskName) {
            return taskLibraryStore.get(taskName);
        },
        removeTask: function(taskName) {
            return taskLibraryStore.remove(taskName);
        },
        fetchGraph: function(graphName) {
            return graphLibraryStore.get(graphName);
        },
        removeGraph: function(graphName) {
            return graphLibraryStore.remove(graphName);
        },
        fetchActiveGraph: function(filter) {
            filter = filter || {};
            if (filter.target) {
                var graphId = graphTargetStore.get(filter.target);
                return runningGraphStore.get(graphId);
            } else if (filter.instanceId) {
                return runningGraphStore.get(filter.instanceId);
            } else {
                return;
            }
        },
        fetchActiveGraphs: function(filter) {
            return runningGraphStore.getAll(filter);
        },
        putActiveGraph: function(graph, target) {
            // TODO: For now, do a blanket "one per" rule, in the future we will want
            // to be more discerning once we expand beyond nodes
            if (target && graphTargetStore.get(target)) {
                throw new Error("Unable to run multiple task graphs against a single target.");
            }
            var _id = graph.instanceId;
            graph.on(graph.completeEventString, function() {
                runningGraphStore.remove(_id);
                graphTargetStore.remove(target);
            });
            runningGraphStore.put(graph.instanceId, graph);
            graphTargetStore.put(target, graph.instanceId);
        },
        hasActiveGraph: function(target) {
            return graphTargetStore.get(target);
        }
    };
}

// Placeholder for a more sophisticated persistence store
function Store (_){
    this.store = {};
    this._ = _;
}

Store.prototype.put = function(name, value) {
    this.store[name] = value;
};

Store.prototype.get = function(name) {
    return this.store[name];
};

Store.prototype.getAll = function(filter) {
    //TODO: implement filter once design is agreed, for now return all
    filter;
    return this._.values(this.store);
};

Store.prototype.remove = function(name) {
    delete this.store[name];
    return this;
};