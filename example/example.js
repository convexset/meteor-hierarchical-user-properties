/* global HierarchicalUserProperties: true */

if (Meteor.isClient) {
	Template.ShowAllNodes.helpers({
		allNodes: () => Template.instance().nodes.get(),
		allActions: () => Template.instance().actions.get(),
	})

	Template.ShowAllNodes.onCreated(function() {
		console.info("[ShowAllNodes] Created")
		var instance = this;

		instance.nodes = new ReactiveVar([]);
		instance.actions = new ReactiveVar([]);

		function updateNodeData(err, res) {
			var newActions = Tracker.nonreactive(instance.actions.get.bind(instance.actions));
			newActions.push(res);
			instance.actions.set(newActions);
			Meteor.call('get-forest', function(err, res) {
				console.log("[" + (new Date()) + "] Nodes:", res);
				instance.nodes.set(res);
			});
		}

		Meteor.call('refresh', updateNodeData);

		_.times(7, function(x) {
			setTimeout(function() {
				Meteor.call("step-" + (x + 1), updateNodeData);
			}, 5000 + x * 5000);
		});
	});
}

if (Meteor.isServer) {
	HierarchicalUserProperties = HierarchicalUserPropertiesFactory({
		name: "WBS"
	});
	HierarchicalUserProperties.DEBUG_MODE = true;

	Meteor.startup(function() {

		Meteor.methods({
			"get-forest": function() {
				return HierarchicalUserProperties._buildForest();
			},
			"refresh": function() {
				console.log("**********************************************");
				console.log("* STARTING UP!!!!")
				console.log("**********************************************");

				HC = HierarchicalUserProperties._HierarchyCollection;
				PAC = HierarchicalUserProperties._PropertyAssignmentCollection;
				MDC = HierarchicalUserProperties._MaterializedDataCollection;
				HC.remove({});
				PAC.remove({});
				MDC.remove({});

				itemA = HC.findOne(HierarchicalUserProperties.createHierarchyItem('A'));
				itemA.createChild();
				itemA1 = HC.findOne(itemA.createChild());
				itemA1.createChild();
				itemA1.createChild();
				itemA13 = HC.findOne(itemA1.createChild());
				itemA13.createChild();
				itemA13.createChild();

				itemB = HC.findOne(HierarchicalUserProperties.createHierarchyItem('B'));
				itemB.createChild();
				itemB.createChild();

				itemA.addPropertyForEntity("hello", "cat");


				return "Refreshed hierarchy";
			},
			"step-1": function() {
				console.log("**********************************************");
				console.log("* 1. Adding property on junior node");
				console.log("**********************************************");
				itemA13.addPropertyForEntity("abc", "prop1");
				Meteor.setTimeout(function() {
					console.log("**********************************************");
				}, 500);
				return "Added property on junior node";
			},
			"step-2": function() {
				console.log("**********************************************");
				console.log("* 2. Adding same property on senior node");
				console.log("**********************************************");
				itemA1.addPropertyForEntity("abc", "prop1");
				Meteor.setTimeout(function() {
					console.log("**********************************************");
				}, 500);
				return "Added property on senior node";
			},
			"step-3": function() {
				var action;
				if (true) {
					console.log("**********************************************");
					console.log("* 3. Removing property on junior node");
					console.log("**********************************************");
					itemA13.removePropertyForEntity("abc", "prop1");
					action = "Removed property on junior node";
				} else {
					console.log("**********************************************");
					console.log("* 3. Removing property on senior node");
					console.log("**********************************************");
					itemA1.removePropertyForEntity("abc", "prop1");
					action = "Removed property on senior node";
				}
				Meteor.setTimeout(function() {
					console.log("**********************************************");
				}, 500);
				return action;
			},
			"step-4": function() {
				console.log("**********************************************");
				console.log("* 4. Adding properties to root of other tree");
				console.log("**********************************************");
				itemB.addPropertyForEntity("xyz", "prop1");
				itemB.addPropertyForEntity("abc", "prop2");
				Meteor.setTimeout(function() {
					console.log("**********************************************");
				}, 500);
				return "Added properties to root of other tree";
			},
			"step-5": function() {
				console.log("**********************************************");
				console.log("* 5. Moving junior node to other tree");
				console.log("**********************************************");
				itemA13.moveTo(itemB);
				Meteor.setTimeout(function() {
					console.log("**********************************************");
				}, 500);
				return "Moved junior node to other tree";
			},
			"step-6": function() {
				console.log("**********************************************");
				console.log("* 6. Removing junior node");
				console.log("**********************************************");
				itemA13.removeNode();
				Meteor.setTimeout(function() {
					console.log("**********************************************");
				}, 500);
				return "Removed junior node";
			},
			"step-7": function() {
				console.log("**********************************************");
				console.log("* 7. Removing other tree");
				console.log("**********************************************");
				itemB.removeSubTree();
				Meteor.setTimeout(function() {
					console.log("**********************************************");
				}, 500);
				return "Removed other tree";
			},
		});


		function cbFn(msg) {
			return function() {
				console.log('-----\n', msg, arguments, '\n-----');
			}
		};
		Meteor.setTimeout(function() {
			console.log('Setting Up Observers');
			HierarchicalUserProperties._HierarchyCursor.observeChanges({
				added: cbFn('[HierarchyCollection|added]'),
				changed: cbFn('[HierarchyCollection|changed]'),
				removed: cbFn('[HierarchyCollection|removed]')
			});
			HierarchicalUserProperties._PropertyAssignmentCursor.observeChanges({
				added: cbFn('[PropertyAssignmentCollection|added]'),
				changed: cbFn('[PropertyAssignmentCollection|changed]'),
				removed: cbFn('[PropertyAssignmentCollection|removed]')
			});
			HierarchicalUserProperties._MaterializedDataCursor.observeChanges({
				added: cbFn('[MaterializedDataCollection|added]'),
				changed: cbFn('[MaterializedDataCollection|changed]'),
				removed: cbFn('[MaterializedDataCollection|removed]')
			});
		}, 2000);
	});
}