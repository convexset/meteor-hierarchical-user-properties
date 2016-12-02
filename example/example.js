import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';
import { ReactiveVar } from 'meteor/reactive-var';
import { _ } from 'underscore';
import { HierarchicalUserPropertiesFactory } from 'meteor/convexset:hierarchical-user-properties';


HierarchicalUserProperties = HierarchicalUserPropertiesFactory({
	name: 'WBS',
	hierarchyCollectionName: 'convexset_HierarchicalUserProperties_Hierarchies',
	propertyAssignmentCollectionName: 'convexset_HierarchicalUserProperties_PropertyAssignments',
	materializedDataCollectionName: 'convexset_HierarchicalUserProperties_MaterializedData',
});
HierarchicalUserProperties.DEBUG_MODE = true;

function WBSItem(doc) {
	_.extend(this, doc);
	// console.log('[TRANSFORM] Hello! This is:', this);
}
WBSItem.prototype = Object.create(HierarchicalUserProperties._HierarchyNodePrototype);
WBSItem.prototype.showSelfAndAncestors = function showSelfAndAncestors() {
	const sAndA = [this._id].concat(this.upstreamNodeIdList);
	console.log(...sAndA);
	return sAndA;
};

WBSCollection = new Mongo.Collection('convexset_HierarchicalUserProperties_Hierarchies', {
	transform: doc => new WBSItem(doc),
	defineMutationMethods: false
});
console.log(HierarchicalUserProperties._HierarchyCollection)

if (Meteor.isClient) {
	Template.ShowAllNodes.helpers({
		allNodes: () => Template.instance().nodes.get(),
		allActions: () => Template.instance().actions.get(),
	});

	Template.ShowAllNodes.onCreated(function() {
		console.info("[ShowAllNodes] Created")
		var instance = this;

		instance.nodes = new ReactiveVar([]);
		instance.actions = new ReactiveVar([]);

		updateNodeData = function updateNodeDataCB(err, res) {
			var newActions = Tracker.nonreactive(instance.actions.get.bind(instance.actions));
			newActions.push(res);
			instance.actions.set(newActions);
			Meteor.call('get-forest', function(err, res) {
				console.log("[" + (new Date()) + "] Nodes:", res);
				instance.nodes.set(res);
			});
		}

		Meteor.call('refresh', updateNodeData);

		_.times(9, function(x) {
			setTimeout(function() {
				Meteor.call("step-" + (x + 1), updateNodeData);
			}, 5000 + x * 5000);
		});
	});
}

if (Meteor.isServer) {
	HC = WBSCollection; // HierarchicalUserProperties._HierarchyCollection;
	PAC = HierarchicalUserProperties._PropertyAssignmentCollection;
	MDC = HierarchicalUserProperties._MaterializedDataCollection;
	HC.remove({});
	PAC.remove({});
	MDC.remove({});

	Meteor.startup(function() {
		Meteor.methods({
			"get-forest": function() {
				return HierarchicalUserProperties._buildForest();
			},
			"refresh": function() {
				this.unblock();
				console.log("**********************************************");
				console.log("* STARTING UP!!!!");
				console.log("**********************************************");

				HC.remove({});
				PAC.remove({});
				MDC.remove({});

				itemA = HierarchicalUserProperties.createHierarchyItem({ where: 'A' });
				itemA1 = itemA.createChild({ where: 'A1' });
				itemA1.createChild({ where: 'on A1' });
				itemA1.createChild({ where: 'on A1' });
				itemA13 = itemA1.createChild({ where: 'A13' });
				itemA2 = itemA.createChild({ where: 'A2' });
				itemA2.createChild({ where: 'on A2' });
				itemA2.createChild({ where: 'on A2' });

				itemB = HierarchicalUserProperties.createHierarchyItem({ where: 'B' });
				itemB.createChild({ where: 'on B' });
				itemB.createChild({ where: 'on B' });

				itemA.addPropertyForEntity("big-boss-cat", "bossing-kitties-around", { a: "big-boss-cat", b: Math.random() });
				itemA.addPropertyForEntity("chair-cat", "bossing-kitties-around", { a: "chair-cat", b: Math.random() });
				itemA.addPropertyForEntity("cleaner-cat", "clearing-kitty-litter", { a: "cleaner-cat", b: Math.random() });
				itemA2.addPropertyForEntity("middle-manager-cat", "bossing-kitties-around", { a: "middle-manager-cat", b: Math.random() });


				return "Refreshed hierarchy. (With cat company leadership!)";
			},
			"step-1": function() {
				this.unblock();
				console.log("**********************************************");
				console.log("* 1. Adding property on junior node");
				console.log("**********************************************");
				itemA13.addPropertyForEntity("some-cat", "some-cat-work", { a: "some-cat", b: Math.random() });
				Meteor.setTimeout(function() {
					console.log("**********************************************");
				}, 500);
				return "Added property on junior node. (Assigning some-cat a role.)";
			},
			"step-2": function() {
				this.unblock();
				console.log("**********************************************");
				console.log("* 2. Adding children to junior node");
				console.log("**********************************************");
				itemA13.createChild();
				itemA13.createChild();
				Meteor.setTimeout(function() {
					console.log("**********************************************");
				}, 500);
				return "Added children to junior node";
			},
			"step-3": function() {
				this.unblock();
				console.log("**********************************************");
				console.log("* 3. Adding same property on senior node");
				console.log("**********************************************");
				itemA1.addPropertyForEntity("some-cat", "some-cat-work", { a: "some-cat", b: Math.random() });
				itemA1.addPropertyForEntity("some-cat", "bossing-kitties-around", { a: "some-cat", b: Math.random() });
				Meteor.setTimeout(function() {
					console.log("**********************************************");
				}, 500);
				return "Added property on senior node (some-cat gets the same role at a higher level)";
			},
			"step-4": function() {
				this.unblock();
				var action;
				if (true) {
					console.log("**********************************************");
					console.log("* 4. Removing property on junior node");
					console.log("**********************************************");
					itemA13.removePropertyForEntity("some-cat", "some-cat-work");
					action = "Removed property on junior node (some-cat to focus on \"management\")";
				} else {
					console.log("**********************************************");
					console.log("* 4. Removing property on senior node");
					console.log("**********************************************");
					itemA1.removePropertyForEntity("some-cat", "some-cat-work");
					action = "Removed property on senior node (some-cat has resigned!?)";
				}
				Meteor.setTimeout(function() {
					console.log("**********************************************");
				}, 500);
				return action;
			},
			"step-5": function() {
				this.unblock();
				console.log("**********************************************");
				console.log("* 5. Adding properties to root of other tree");
				console.log("**********************************************");
				itemB.addPropertyForEntity("rat", "flee-from-predators", { a: "rat", b: Math.random() });
				itemB.addPropertyForEntity("bird", "flee-from-predators", { a: "bird", b: Math.random() });
				Meteor.setTimeout(function() {
					console.log("**********************************************");
				}, 500);
				return "Added properties to root of other tree (non-cats getting non-cat roles)";
			},
			"step-6": function() {
				this.unblock();
				console.log("**********************************************");
				console.log("* 6. Moving junior node to other tree");
				console.log("**********************************************");
				itemA13.moveTo(itemB);
				Meteor.setTimeout(function() {
					console.log("**********************************************");
				}, 500);
				return "Moved junior node to other tree (Selling off a Unit)";
			},
			"step-7": function() {
				this.unblock();
				console.log("**********************************************");
				console.log("* 7. Removing junior node");
				console.log("**********************************************");
				itemA13.removeNode();
				Meteor.setTimeout(function() {
					console.log("**********************************************");
				}, 500);
				return "Removed junior node (Re-org in Other Company)";
			},
			"step-8": function() {
				this.unblock();
				console.log("**********************************************");
				console.log("* 8. Removing other tree");
				console.log("**********************************************");
				itemB.removeSubTree();
				Meteor.setTimeout(function() {
					console.log("**********************************************");
				}, 500);
				return "Removed other tree (Going out of business?)";
			},
			"step-9": function() {
				this.unblock();
				console.log("**********************************************");
				console.log("* 9. Removing one property on root");
				console.log("**********************************************");
				itemA.removePropertyForEntity("big-boss-cat", "bossing-kitties-around");
				Meteor.setTimeout(function() {
					console.log("**********************************************");
				}, 500);
				return "Removed one property on root (big-boss-cat gets removed)";
			},
		});


		function cbFn(msg, doCheckWithHC = false) {
			return function(doc) {
				if (doCheckWithHC) {
					// let hcDoc = HierarchicalUserProperties._HierarchyCollection.findOne({_id: doc.nodeId});
					let hcDoc = WBSCollection.findOne({ _id: doc.nodeId });
					const hcUsnList = hcDoc.upstreamNodeIdList.sort();
					const ownUsnList = (doc.upstreamNodeIdList || ['!!!!!!']).sort();
					console.log('-----\n', msg, arguments, _.isEqual(hcUsnList, ownUsnList) ? ['Ok.'] : ['****** NOT OK! ******', doc, hcDoc], '\n-----');
				} else {
					console.log('-----\n', msg, arguments, '\n-----');
				}
			};
		}

		if (HierarchicalUserProperties.DEBUG_MODE) {
			Meteor.setTimeout(() => {
				console.log('[Setting Up Observers]');
				// HierarchicalUserProperties._HierarchyCollection.find().observe({
				WBSCollection.find().observe({
					added: cbFn('[HierarchyCollection|added]'),
					changed: cbFn('[HierarchyCollection|changed]'),
					removed: cbFn('[HierarchyCollection|removed]')
				});
				HierarchicalUserProperties._PropertyAssignmentCollection.find().observe({
					added: cbFn('[PropertyAssignmentCollection|added]', true),
					changed: cbFn('[PropertyAssignmentCollection|changed]', true),
					removed: cbFn('[PropertyAssignmentCollection|removed]')
				});
				HierarchicalUserProperties._MaterializedDataCollection.find().observe({
					added: cbFn('[MaterializedDataCollection|added]', true),
					changed: cbFn('[MaterializedDataCollection|changed]', true),
					removed: cbFn('[MaterializedDataCollection|removed]')
				});
			}, 2000);
		}
	});
}
