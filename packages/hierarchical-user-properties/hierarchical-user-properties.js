/* global HierarchicalUserPropertiesFactory: true */

import { checkNpmVersions } from 'meteor/tmeasday:check-npm-versions';
checkNpmVersions({
  'package-utils': '^0.2.1',
  'underscore' : '^1.8.3',
});
const PackageUtilities = require('package-utils');
const _ = require('underscore');

HierarchicalUserPropertiesFactory = function HierarchicalUserPropertiesFactory({
	name = "Properties",
	hierarchyCollectionName = "convexset_HierarchicalUserProperties_Hierarchies",
	propertyAssignmentCollectionName = "convexset_HierarchicalUserProperties_PropertyAssignments",
	materializedDataCollectionName = "convexset_HierarchicalUserProperties_MaterializedData",
} = {}) {
	var _hup = function HierarchicalUserProperties() {};
	var HUP = new _hup();

	// Debug Mode
	var _debugMode = false;
	PackageUtilities.addPropertyGetterAndSetter(HUP, "DEBUG_MODE", {
		get: () => _debugMode,
		set: function(value) {
			_debugMode = !!value;
			INFO('Debug Mode:', _debugMode);
		},
	});

	function LOG(...args) {
		if (_debugMode) {
			console.log.apply(console, ['[HierarchicalUserProperties|' + name + ']'].concat(args));
		}
	}

	function INFO(...args) {
		if (_debugMode) {
			console.info.apply(console, ['[HierarchicalUserProperties|' + name + ']'].concat(args));
		}
	}

	function WARN(...args) {
		if (_debugMode) {
			console.warn.apply(console, ['[HierarchicalUserProperties|' + name + ']'].concat(args));
		}
	}

	function ERROR(...args) {
		if (_debugMode) {
			console.error.apply(console, ['[HierarchicalUserProperties|' + name + ']'].concat(args));
		}
	}

	// Core Collections
	var HierarchyCollection;
	var PropertyAssignmentCollection;
	var MaterializedDataCollection;

	(function SettingUpHierarchyNode() {
		LOG('Setting up HierarchyNode...');

		function HierarchyNode(doc) {
			return _.extend(this, doc);
		}
		/*
			HierarchyCollection:
			Schema: {
				parentId: HierarchyCollection._id,
				upstreamNodeIdList: [HierarchyCollection._id],
			}
		*/
		function materializeForChildren_withStopsAtPropertyDefinitions(entityName, property, node, proximity) {
			node.getChildren().forEach(function(child) {
				var _itemData = {
					entityName: entityName,
					property: property,
					nodeId: child._id
				};
				var _materializedDataElem = HUP.getMaterializedDataItem(_itemData);
				if ((!_materializedDataElem) || (_materializedDataElem.upstreamDistance !== 0)) {
					if (!_materializedDataElem) {
						LOG("inserting materialized property data record because no data at", _itemData);
					} else {
						LOG("updating existing materialized property data", _materializedDataElem);
						LOG("new upstreamDistance:", proximity + 1);
					}

					MaterializedDataCollection.upsert({
						entityName: entityName,
						property: property,
						nodeId: child._id,
					}, {
						$set: {
							upstreamDistance: proximity + 1
						}
					});
					materializeForChildren_withStopsAtPropertyDefinitions(entityName, property, child, proximity + 1);
				} else {
					LOG("not proceeding with materialization from here", _materializedDataElem);
				}
			});
		}

		function propagateMaterialization_withNoStopChecks(node, entityName, property, upstreamDistance = 0) {
			MaterializedDataCollection.upsert({
				nodeId: node._id,
				entityName: entityName,
				property: property
			}, {
				$set: {
					upstreamDistance: upstreamDistance
				}
			});
			node.getChildren().forEach(child => propagateMaterialization_withNoStopChecks(child, entityName, property, upstreamDistance + 1));
		}


		HierarchyNode.prototype = {
			getChildren: function getChildren() {
				return HierarchyCollection.find({
					parentId: this._id,
				}).fetch();
			},
			getAllDescendants: function getAllDescendants() {
				return HierarchyCollection.find({
					upstreamNodeIdList: this._id,
				}).fetch();
			},
			getPropertyAssignments: function getPropertyAssignments() {
				return PropertyAssignmentCollection.find({
					nodeId: this._id,
				}).fetch();
			},
			getMaterializedPropertyData: function getMaterializedPropertyData() {
				return MaterializedDataCollection.find({
					nodeId: this._id,
				}).fetch();
			},
			getPropertiesForEntity_OriginalAssignments: function getPropertiesForEntity_OriginalAssignments(entityName) {
				return PropertyAssignmentCollection.find({
					nodeId: this._id,
					entityName: entityName
				}).map(pa => pa.property);
			},
			getEntitiesWithProperty_OriginalAssignments: function getEntitiesWithProperty_OriginalAssignments(property) {
				return PropertyAssignmentCollection.find({
					nodeId: this._id,
					property: property
				}).map(pa => pa.entityName);
			},
			getPropertiesForEntity: function getPropertiesForEntity(entityName) {
				var ret = {};
				MaterializedDataCollection.find({
					nodeId: this._id,
					entityName: entityName
				}).forEach(function(mpd) {
					ret[mpd.property] = mpd.upstreamDistance;
				});
				return ret;
			},
			getEntitiesWithProperty: function getEntitiesWithProperty(property) {
				var ret = {};
				MaterializedDataCollection.find({
					nodeId: this._id,
					property: property
				}).forEach(function(mpd) {
					ret[mpd.entityName] = mpd.upstreamDistance;
				});
				return ret;
			},
			getRoot: function getRoot() {
				if (this.parentId === null) {
					return this;
				}
				return HierarchyCollection.findOne({
					_id: {
						$in: this.upstreamNodeIdList
					},
					parentId: null
				});
			},
			_populateSelf: function _populateSelf() {
				var self = this;

				self.propertyAssignments = {
					byEntityName: {},
					byProperty: {},
				};
				self.materializedPropertyData = {
					byEntityName: {},
					byProperty: {},
				};

				PropertyAssignmentCollection.find({
					nodeId: self._id
				}).forEach(function(pa) {
					if (self.propertyAssignments.byEntityName.hasOwnProperty(pa.entityName)) {
						self.propertyAssignments.byEntityName[pa.entityName].push(pa.property);
					} else {
						self.propertyAssignments.byEntityName[pa.entityName] = [pa.property];
					}

					if (self.propertyAssignments.byProperty.hasOwnProperty(pa.property)) {
						self.propertyAssignments.byProperty[pa.property].push(pa.entityName);
					} else {
						self.propertyAssignments.byProperty[pa.property] = [pa.entityName];
					}
				});

				MaterializedDataCollection.find({
					nodeId: self._id
				}).forEach(function(mpd) {
					if (self.materializedPropertyData.byEntityName.hasOwnProperty(mpd.entityName)) {
						self.materializedPropertyData.byEntityName[mpd.entityName][mpd.property] = mpd.upstreamDistance;
					} else {
						self.materializedPropertyData.byEntityName[mpd.entityName] = {
							[mpd.property]: mpd.upstreamDistance
						};
					}

					if (self.materializedPropertyData.byProperty.hasOwnProperty(mpd.property)) {
						self.materializedPropertyData.byProperty[mpd.property][mpd.entityName] = mpd.upstreamDistance;
					} else {
						self.materializedPropertyData.byProperty[mpd.property] = {
							[mpd.entityName]: mpd.upstreamDistance
						};
					}
				});
			},
			_buildTree: function _buildTree() {
				function populateSubtree(node) {
					node._populateSelf();
					node.children = node.getChildren();
					node.children.forEach(populateSubtree);
				}
				populateSubtree(this);
			}
		};

		if (Meteor.isServer) {
			_.extend(HierarchyNode.prototype, {
				createChild: function createChild() {
					var self = this;

					// insert
					var _id = HierarchyCollection.insert({
						parentId: self._id,
						upstreamNodeIdList: [self._id].concat(self.upstreamNodeIdList),
					});

					// if child successfully created...
					if (!!_id) {
						// ... find materialized property data on parent
						// and add them to child (with appropriate proximity)
						MaterializedDataCollection.find({
							nodeId: self._id
						}).forEach(function(mpd) {
							delete mpd._id;
							MaterializedDataCollection.insert(_.extend(mpd, {
								nodeId: _id,
								upstreamDistance: mpd.upstreamDistance + 1
							}));
						});
					} else {
						ERROR("unable to create child at", self);
						throw new Meteor.Error("unable-to-create-child");
					}

					var item = HierarchyCollection.findOne({
						_id: _id
					});
					LOG("[createChild] parent:", self, "; child: ", item);
					return item;
				},
				removeNode: function removeNode() {
					var self = this;
					LOG("Removing node:", self._id);

					// for all child nodes...
					self.getChildren().forEach(function(item) {
						// ... remove current node from upstreamNodeIdList
						// and update parent to current node's parent
						var new_upstreamNodeIdList = item.upstreamNodeIdList.filter(x => x !== self._id);
						var update = {
							parentId: self.parentId,
							upstreamNodeIdList: new_upstreamNodeIdList
						};
						HierarchyCollection.update({
							_id: item._id
						}, {
							$set: update
						});
						_.extend(item, update);

						// then clear existing materializations and regenerate
						// materializations
						LOG("Clearing and then regenerating materializations...");
						item._clearMaterializationRecursive();
						item._regenerateMaterializationsRecursive();
					});

					// remove current node, property assignments and
					// property data materializations
					PropertyAssignmentCollection.remove({
						nodeId: this._id
					});
					MaterializedDataCollection.remove({
						nodeId: this._id
					});
					HierarchyCollection.remove({
						_id: this._id
					});
				},
				removeSubTree: function removeSubTree() {
					LOG("Removing node rooting sub-tree:", this._id);
					var idsToRemove = HierarchyCollection.find({
						upstreamNodeIdList: this._id
					}).map(x => x._id);
					LOG("Downstream nodes to remove:", idsToRemove);
					idsToRemove = idsToRemove.concat([this._id]);

					// easy remove job... just nuke everything
					PropertyAssignmentCollection.remove({
						nodeId: {
							$in: idsToRemove
						}
					});
					MaterializedDataCollection.remove({
						nodeId: {
							$in: idsToRemove
						}
					});
					HierarchyCollection.remove({
						_id: {
							$in: idsToRemove
						}
					});
				},
				detach: function detach(_doClearAndRegenerateMaterialization = true) {
					LOG("Detaching current node from parent:", this._id);
					var self = this;
					self.getAllDescendants().forEach(function(item) {
						// remove upstreamNodeIdList ancestors of current node
						// in descendants of current node
						var new_upstreamNodeIdList = item.upstreamNodeIdList.filter(x => self.upstreamNodeIdList.indexOf(x) === -1);
						HierarchyCollection.update({
							_id: item._id
						}, {
							$set: {
								upstreamNodeIdList: new_upstreamNodeIdList
							}
						});
					});

					// detach current node
					var update = {
						parentId: null,
						upstreamNodeIdList: [],
					};
					_.extend(self, update);
					HierarchyCollection.update({
						_id: self._id
					}, {
						$set: update
					});

					if (_doClearAndRegenerateMaterialization) {
						LOG("Clearing and then regenerating materializations...");
						self._clearMaterializationRecursive();
						self._regenerateMaterializationsRecursive();
					}
				},
				attachTo: function attachTo(node) {
					if (node === self) {
						ERROR("Cannot attach to self", self);
						throw new Meteor.Error("cannot-attach-to-self");
					}
					LOG("Attaching current node (" + this._id + ") to", node);
					var self = this;
					if (!!self.parentId) {
						ERROR('current-node-already-attached', self);
						throw new Meteor.Error('current-node-already-attached');
					}
					if (!(node instanceof HierarchyNode)) {
						ERROR('invalid-target (not a HierarchyNode)', self);
						throw new Meteor.Error('invalid-target');
					}

					self.getAllDescendants().forEach(function(item) {
						// update upstreamNodeIdList to include node and its
						// ancestors
						var new_upstreamNodeIdList = item.upstreamNodeIdList.concat([node._id], node.upstreamNodeIdList);
						HierarchyCollection.update({
							_id: item._id
						}, {
							$set: {
								upstreamNodeIdList: new_upstreamNodeIdList
							}
						});
					});

					var update = {
						parentId: node._id,
						upstreamNodeIdList: self.upstreamNodeIdList.concat([node._id], node.upstreamNodeIdList)
					};
					_.extend(self, update);
					HierarchyCollection.update({
						_id: self._id
					}, {
						$set: update
					});

					// Materialize based on parent
					LOG("Clearing and then regenerating materializations...");
					self._clearMaterializationRecursive();
					self._regenerateMaterializationsRecursive();
				},
				moveTo: function moveTo(node) {
					LOG("Moving current node (" + this._id + ") to child list of", node);
					var self = this;
					if (node === self) {
						ERROR("Cannot attach to self", self);
						throw new Meteor.Error("cannot-attach-to-self");
					}
					self.detach(false);
					self.attachTo(node);
				},
				addPropertyForEntity: function addPropertyForEntity(entityName, property) {
					var self = this;
					LOG("Adding property " + property + " for entity " + entityName + " on", self);
					var itemData = {
						entityName: entityName,
						nodeId: self._id,
						property: property,
					};
					var curr = HUP.getPropertyAssignmentItem(itemData);
					if (!!curr) {
						WARN('entity-already-assigned-property-here', self, curr);
						return;
					}
					PropertyAssignmentCollection.insert(itemData);
					MaterializedDataCollection.upsert(itemData, {
						$set: {
							upstreamDistance: 0
						}
					});

					// materialize for children
					materializeForChildren_withStopsAtPropertyDefinitions(entityName, property, self, 0);
				},
				removePropertyForEntity: function removePropertyForEntity(entityName, property) {
					var self = this;
					LOG("Removing property " + property + " for entity " + entityName + " on", self);
					var itemData = {
						entityName: entityName,
						nodeId: self._id,
						property: property,
					};
					var curr = HUP.getPropertyAssignmentItem(itemData);
					if (!curr) {
						WARN('no-such-property-for-entity-here', self, itemData);
						return;
					} else {
						LOG("removing property assignment item", curr);
						PropertyAssignmentCollection.remove(curr);
					}

					// check parent for the same materialized property data
					var parentMPD = HUP.getMaterializedDataItem(_.extend({}, itemData, {
						nodeId: self.parentId
					}));
					LOG("checking parent for the same materialized property data... result:", parentMPD);

					function recursiveMPDUpdate(node, upstreamDistance) {
						// deal with self, then children
						if (typeof upstreamDistance === "undefined") {
							// remove mode
							LOG("recursive update [entityName=" + entityName + ", property=" + property + "] (remove mode) at", node);
							MaterializedDataCollection.remove({
								entityName: entityName,
								nodeId: node._id,
								property: property,
							});
						} else {
							// update mode
							LOG("recursive update [entityName=" + entityName + ", property=" + property + "] (update mode) with upstreamDistance=" + upstreamDistance + " at", node);
							MaterializedDataCollection.update({
								entityName: entityName,
								nodeId: node._id,
								property: property,
							}, {
								$set: {
									upstreamDistance: upstreamDistance
								}
							});
						}

						node.getChildren().forEach(function(child) {
							var _itemData = {
								entityName: entityName,
								property: property,
								nodeId: child._id
							};
							var _materializedDataElem = HUP.getMaterializedDataItem(_itemData);

							if (_materializedDataElem.upstreamDistance !== 0) {
								// only remove/update if upstreamDistance !== 0
								if (typeof upstreamDistance === "undefined") {
									// remove mode
									recursiveMPDUpdate(child);
								} else {
									// update mode
									recursiveMPDUpdate(child, upstreamDistance + 1);
								}
							} else {
								LOG("recursive update not proceeding (since mpd.upstreamDistance=0) at", child);
							}
						});
					}

					if (!!parentMPD) {
						// if parent has some materialized property data, update materialization on subtree, stopping at those with upstreamDistance = 0
						LOG("parent has relevant MPD with proximity " + parentMPD.upstreamDistance);

						// recursiveMPDUpdate in update mode
						recursiveMPDUpdate(self, parentMPD.upstreamDistance + 1);
					} else {
						// if parent does not have that, remove traces on subtree, stopping at those with upstreamDistance = 0
						LOG("parent does not have relevant MPD");

						// recursiveMPDUpdate in remove mode
						recursiveMPDUpdate(self);
					}
				},
				_clearMaterializationRecursive: function _clearMaterializationRecursive() {
					var self = this;
					MaterializedDataCollection.remove({
						nodeId: self._id,
					});
					self.getChildren().forEach(child => child._clearMaterializationRecursive());
				},
				_regenerateMaterializationsRecursive: function _regenerateMaterializationsRecursive(initialCall = true) {
					// assumption: 
					var self = this;

					if (initialCall) {
						LOG("_regenerateMaterializationsRecursive initial call");
						if (!!self.parentId) {
							LOG("Parent exists. Checking parent materializations...");
							MaterializedDataCollection.find({
								nodeId: self.parentId
							}).forEach(function(mpd) {
								propagateMaterialization_withNoStopChecks(self, mpd.entityName, mpd.property, mpd.upstreamDistance + 1);
							});
						} else {
							LOG("No parent. (No need to consider parent materializations)");
						}
					}

					PropertyAssignmentCollection.find({
						nodeId: self._id,
					}).forEach(function(pa) {
						propagateMaterialization_withNoStopChecks(self, pa.entityName, pa.property);
					});

					self.getChildren().forEach(child => child._regenerateMaterializationsRecursive(false));
				},
			});
		}

		HierarchyCollection = new Mongo.Collection(hierarchyCollectionName, {
			transform: function(doc) {
				return new HierarchyNode(doc);
			},
			defineMutationMethods: false
		});
		PackageUtilities.addPropertyGetter(HUP, "_HierarchyCollection", () => HierarchyCollection);
		PackageUtilities.addPropertyGetter(HUP, "_HierarchyCursor", () => HierarchyCollection.find());
		PackageUtilities.addImmutablePropertyFunction(HUP, "getHierarchyItem", (selector) => !!selector ? HierarchyCollection.findOne(selector) : HierarchyCollection.findOne());
		PackageUtilities.addImmutablePropertyFunction(HUP, "getHierarchyCursor", (selector) => !!selector ? HierarchyCollection.find(selector) : HierarchyCollection.find());

		if (Meteor.isServer) {
			PackageUtilities.addImmutablePropertyFunction(HUP, "createHierarchyItem", function createHierarchyItem() {
				var _id = HierarchyCollection.insert({
					parentId: null,
					upstreamNodeIdList: [],
				});
				var item = HierarchyCollection.findOne({
					_id: _id
				});
				LOG("[createHierarchyItem]", item);
				return item;
			});
		}

		if (Meteor.isServer) {
			(function() {
				var entries = [
					[
						["parentId", 1]
					],
					[
						["upstreamNodeIdList", 1]
					]
				];
				_.forEach(entries, function(entry) {
					INFO('db.' + HierarchyCollection._name + '.createIndex({' + (entry.map(x => "\"" + x[0] + "\": " + x[1]).join(', ') + '});'));
					HierarchyCollection._ensureIndex(_.object(entry));
				});
			}());
		}
	}());

	(function SettingUpPropertyAssignmentCollection() {
		LOG('Setting up PropertyAssignmentCollection...');
		/*
			PropertyAssignmentCollection:
			Schema: {
				nodeId: HierarchyCollection._id,
				entityName: String,
				property: String,
			}
		*/
		PropertyAssignmentCollection = new Mongo.Collection(propertyAssignmentCollectionName, {
			defineMutationMethods: false
		});
		PackageUtilities.addPropertyGetter(HUP, "_PropertyAssignmentCollection", () => PropertyAssignmentCollection);
		PackageUtilities.addPropertyGetter(HUP, "_PropertyAssignmentCursor", () => PropertyAssignmentCollection.find());
		PackageUtilities.addImmutablePropertyFunction(HUP, "getPropertyAssignmentItem", (selector) => !!selector ? PropertyAssignmentCollection.findOne(selector) : PropertyAssignmentCollection.findOne());
		PackageUtilities.addImmutablePropertyFunction(HUP, "getPropertyAssignmentCursor", (selector) => !!selector ? PropertyAssignmentCollection.find(selector) : PropertyAssignmentCollection.find());

		if (Meteor.isServer) {
			(function() {
				var entries = [
					[
						["entityName", 1],
						["property", 1]
					],
					[
						["nodeId", 1],
						["property", 1],
					],
					[
						["nodeId", 1],
						["entityName", 1],
					],
				];
				_.forEach(entries, function(entry) {
					INFO('db.' + PropertyAssignmentCollection._name + '.createIndex({' + (entry.map(x => "\"" + x[0] + "\": " + x[1]).join(', ') + '});'));
					PropertyAssignmentCollection._ensureIndex(_.object(entry));
				});
			}());
		}
	}());

	(function SettingUpMaterializedDataCollection() {
		LOG('Setting up MaterializedDataCollection...');
		/*
			MaterializedDataCollection:
			Schema: {
				nodeId: HierarchyCollection._id,
				entityName: String,
				property: String,
				upstreamDistance: Number
			}
		*/
		MaterializedDataCollection = new Mongo.Collection(materializedDataCollectionName, {
			defineMutationMethods: false
		});
		PackageUtilities.addPropertyGetter(HUP, "_MaterializedDataCollection", () => MaterializedDataCollection);
		PackageUtilities.addPropertyGetter(HUP, "_MaterializedDataCursor", () => MaterializedDataCollection.find());
		PackageUtilities.addImmutablePropertyFunction(HUP, "getMaterializedDataItem", (selector) => !!selector ? MaterializedDataCollection.findOne(selector) : MaterializedDataCollection.findOne());
		PackageUtilities.addImmutablePropertyFunction(HUP, "getMaterializedDataCursor", (selector) => !!selector ? MaterializedDataCollection.find(selector) : MaterializedDataCollection.find());

		if (Meteor.isServer) {
			(function() {
				var entries = [
					[
						["entityName", 1]
					],
					[
						["property", 1]
					],
					[
						["nodeId", 1],
						["property", 1],
					],
					[
						["nodeId", 1],
						["entityName", 1],
					],
				];
				_.forEach(entries, function(entry) {
					INFO('db.' + MaterializedDataCollection._name + '.createIndex({' + (entry.map(x => "\"" + x[0] + "\": " + x[1]).join(', ') + '});'));
					MaterializedDataCollection._ensureIndex(_.object(entry));
				});
			}());
		}
	}());

	PackageUtilities.addImmutablePropertyFunction(HUP, "_buildForest", function buildForest() {
		var roots = HierarchyCollection.find({
			parentId: null
		}).fetch();
		roots.forEach(node => node._buildTree());
		return roots;
	});

	return HUP;
};