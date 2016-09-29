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
				this.unblock();
				console.log("**********************************************");
				console.log("* STARTING UP!!!!")
				console.log("**********************************************");

				HC = HierarchicalUserProperties._HierarchyCollection;
				PAC = HierarchicalUserProperties._PropertyAssignmentCollection;
				MDC = HierarchicalUserProperties._MaterializedDataCollection;
				HC.remove({});
				PAC.remove({});
				MDC.remove({});

				itemA = HierarchicalUserProperties.createHierarchyItem();
				itemA1 = itemA.createChild();
				itemA1.createChild();
				itemA1.createChild();
				itemA13 = itemA1.createChild();
				itemA2 = itemA.createChild();
				itemA2.createChild()
				itemA2.createChild()

				itemB = HierarchicalUserProperties.createHierarchyItem();
				itemB.createChild();
				itemB.createChild();

				itemA.addPropertyForEntity("big-boss-cat", "bossing-kitties-around");
				itemA.addPropertyForEntity("chair-cat", "bossing-kitties-around");
				itemA.addPropertyForEntity("cleaner-cat", "clearing-kitty-litter");
				itemA2.addPropertyForEntity("middle-manager-cat", "bossing-kitties-around");


				return "Refreshed hierarchy. (With cat company leadership!)";
			},
			"step-1": function() {
				this.unblock();
				console.log("**********************************************");
				console.log("* 1. Adding property on junior node");
				console.log("**********************************************");
				itemA13.addPropertyForEntity("some-cat", "some-cat-work");
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
				itemA1.addPropertyForEntity("some-cat", "some-cat-work");
				itemA1.addPropertyForEntity("some-cat", "bossing-kitties-around");
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
				itemB.addPropertyForEntity("rat", "flee-from-predators");
				itemB.addPropertyForEntity("bird", "flee-from-predators");
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
					let hcDoc = HierarchicalUserProperties._HierarchyCollection.findOne({_id: doc.nodeId});
					const hcUsnList = hcDoc.upstreamNodeIdList.sort();
					const ownUsnList = (doc.upstreamNodeIdList || ['!!!!!!']).sort();
					console.log('-----\n', msg, arguments, _.isEqual(hcUsnList, ownUsnList) ? ['Ok.'] : ['****** NOT OK! ******', doc, hcDoc], '\n-----');
				} else {
					console.log('-----\n', msg, arguments, '\n-----');
				}
			}
		};
		Meteor.setTimeout(function() {
			console.log('Setting Up Observers');
			HierarchicalUserProperties._HierarchyCursor.observe({
				added: cbFn('[HierarchyCollection|added]'),
				changed: cbFn('[HierarchyCollection|changed]'),
				removed: cbFn('[HierarchyCollection|removed]')
			});
			HierarchicalUserProperties._PropertyAssignmentCursor.observe({
				added: cbFn('[PropertyAssignmentCollection|added]', true),
				changed: cbFn('[PropertyAssignmentCollection|changed]', true),
				removed: cbFn('[PropertyAssignmentCollection|removed]')
			});
			HierarchicalUserProperties._MaterializedDataCursor.observe({
				added: cbFn('[MaterializedDataCollection|added]', true),
				changed: cbFn('[MaterializedDataCollection|changed]', true),
				removed: cbFn('[MaterializedDataCollection|removed]')
			});
		}, 2000);
	});
}