/* global HierarchicalUserPropertiesFactory: true */
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

import { checkNpmVersions } from 'meteor/tmeasday:check-npm-versions';
checkNpmVersions({
	'package-utils': '^0.2.1',
	'underscore': '^1.8.3',
});
const PackageUtilities = require('package-utils');
const _ = require('underscore');

HierarchicalUserPropertiesFactory = function HierarchicalUserPropertiesFactory({
	name = 'Properties',
	hierarchyCollectionName = 'convexset_HierarchicalUserProperties_Hierarchies',
	propertyAssignmentCollectionName = 'convexset_HierarchicalUserProperties_PropertyAssignments',
	materializedDataCollectionName = 'convexset_HierarchicalUserProperties_MaterializedData',
} = {}) {
	const _hup = function HierarchicalUserProperties() {};
	const HUP = new _hup();

	// Debug Mode
	let _debugMode = false;
	PackageUtilities.addPropertyGetterAndSetter(HUP, 'DEBUG_MODE', {
		get: () => _debugMode,
		set: function(value) {
			_debugMode = !!value;
			INFO('Debug Mode:', _debugMode);
		},
	});

	function LOG(...args) {
		if (_debugMode) {
			// eslint-disable-next-line no-console
			console.log(`[HierarchicalUserProperties|${name}]`, ...args);
		}
	}

	function INFO(...args) {
		if (_debugMode) {
			// eslint-disable-next-line no-console
			console.info(`[HierarchicalUserProperties|${name}]`, ...args);
		}
	}

	function WARN(...args) {
		if (_debugMode) {
			// eslint-disable-next-line no-console
			console.warn(`[HierarchicalUserProperties|${name}]`, ...args);
		}
	}

	function ERROR(...args) {
		if (_debugMode) {
			// eslint-disable-next-line no-console
			console.error(`[HierarchicalUserProperties|${name}]`, ...args);
		}
	}

	// Core Collections
	let HierarchyCollection;
	let PropertyAssignmentCollection;
	let MaterializedDataCollection;

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
		function materializeForChildrenWithStopsAtPropertyDefinitions(entityName, property, metadata, node, proximity) {
			node.getChildren().forEach(child => {
				const _itemData = {
					entityName: entityName,
					property: property,
					nodeId: child._id,
				};
				const _materializedDataElem = HUP.getMaterializedDataItem(_itemData);
				if ((!_materializedDataElem) || (_materializedDataElem.upstreamDistance !== 0)) {
					if (!_materializedDataElem) {
						LOG('inserting materialized property data record because no data at', _itemData);
					} else {
						LOG('updating existing materialized property data', _materializedDataElem);
						LOG('new upstreamDistance:', proximity + 1);
					}

					MaterializedDataCollection.upsert({
						entityName: entityName,
						property: property,
						nodeId: child._id,
						upstreamNodeIdList: child.upstreamNodeIdList
					}, {
						$set: {
							metadata: metadata,
							upstreamDistance: proximity + 1
						}
					});
					materializeForChildrenWithStopsAtPropertyDefinitions(entityName, property, metadata, child, proximity + 1);
				} else {
					LOG('not proceeding with materialization from here', _materializedDataElem);
				}
			});
		}

		function propagateMaterializationWithNoStopChecks(node, entityName, property, metadata, upstreamDistance = 0) {
			MaterializedDataCollection.upsert({
				nodeId: node._id,
				entityName: entityName,
				property: property
			}, {
				$set: {
					metadata: metadata,
					upstreamDistance: upstreamDistance,
					upstreamNodeIdList: node.upstreamNodeIdList
				}
			});
			node.getChildren().forEach(child => propagateMaterializationWithNoStopChecks(child, entityName, property, metadata, upstreamDistance + 1));
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
			getPropertiesForEntity_OriginalAssignments: function getPropertiesForEntityOriginalAssignments(entityName) {
				return PropertyAssignmentCollection.find({
					nodeId: this._id,
					entityName: entityName
				}).map(pa => pa.property);
			},
			getEntitiesWithProperty_OriginalAssignments: function getEntitiesWithPropertyOriginalAssignments(property) {
				return PropertyAssignmentCollection.find({
					nodeId: this._id,
					property: property
				}).map(pa => pa.entityName);
			},
			getPropertiesForEntity: function getPropertiesForEntity(entityName) {
				const ret = {};
				MaterializedDataCollection.find({
					nodeId: this._id,
					entityName: entityName
				}).forEach(mpd => {
					ret[mpd.property] = mpd.upstreamDistance;
				});
				return ret;
			},
			getEntitiesWithProperty: function getEntitiesWithProperty(property) {
				const ret = {};
				MaterializedDataCollection.find({
					nodeId: this._id,
					property: property
				}).forEach(mpd => {
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
				const self = this;

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
				}).forEach(pa => {
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
				}).forEach(mpd => {
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
					const self = this;

					// insert
					const childUpstreamNodeIdList = [self._id].concat(self.upstreamNodeIdList);
					const _id = HierarchyCollection.insert({
						parentId: self._id,
						upstreamNodeIdList: childUpstreamNodeIdList,
					});

					// if child successfully created...
					if (!!_id) {
						// ... find materialized property data on parent
						// and add them to child (with appropriate proximity)
						MaterializedDataCollection.find({
							nodeId: self._id
						}).forEach(mpd => {
							delete mpd._id;
							MaterializedDataCollection.insert(_.extend(mpd, {
								nodeId: _id,
								upstreamDistance: mpd.upstreamDistance + 1,
								upstreamNodeIdList: childUpstreamNodeIdList
							}));
						});
					} else {
						ERROR('unable to create child at', self);
						throw new Meteor.Error('unable-to-create-child');
					}

					const item = HierarchyCollection.findOne({
						_id: _id
					});
					LOG('[createChild] parent:', self, '; child: ', item);
					return item;
				},
				removeNode: function removeNode() {
					const self = this;
					LOG('Removing node:', self._id);

					// for all child nodes...
					self.getChildren().forEach(item => {
						// ... remove current node from upstreamNodeIdList
						// and update parent to current node's parent
						const newUpstreamNodeIdList = item.upstreamNodeIdList.filter(x => x !== self._id);
						const update = {
							parentId: self.parentId,
							upstreamNodeIdList: newUpstreamNodeIdList
						};
						HierarchyCollection.update({
							_id: item._id
						}, {
							$set: update
						});
						_.extend(item, update);

						MaterializedDataCollection.update({
							nodeId: item._id
						}, {
							$set: {
								upstreamNodeIdList: newUpstreamNodeIdList
							}
						});

						PropertyAssignmentCollection.update({
							nodeId: item._id
						}, {
							$set: {
								upstreamNodeIdList: newUpstreamNodeIdList
							}
						});

						// then clear existing materializations and regenerate
						// materializations
						LOG('Clearing and then regenerating materializations...');
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
					LOG('Removing node rooting sub-tree:', this._id);
					let idsToRemove = HierarchyCollection.find({
						upstreamNodeIdList: this._id
					}).map(x => x._id);
					LOG('Downstream nodes to remove:', idsToRemove);
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
					LOG('Detaching current node from parent:', this._id);
					const self = this;
					self.getAllDescendants().forEach(item => {
						// remove upstreamNodeIdList ancestors of current node
						// in descendants of current node
						const newUpstreamNodeIdList = item.upstreamNodeIdList.filter(x => self.upstreamNodeIdList.indexOf(x) === -1);
						HierarchyCollection.update({
							_id: item._id
						}, {
							$set: {
								upstreamNodeIdList: newUpstreamNodeIdList
							}
						});

						MaterializedDataCollection.update({
							nodeId: item._id
						}, {
							$set: {
								upstreamNodeIdList: newUpstreamNodeIdList
							}
						});

						PropertyAssignmentCollection.update({
							nodeId: item._id
						}, {
							$set: {
								upstreamNodeIdList: newUpstreamNodeIdList
							}
						});
					});

					// detach current node
					const update = {
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
						LOG('Clearing and then regenerating materializations...');
						self._clearMaterializationRecursive();
						self._regenerateMaterializationsRecursive();
					}
				},
				attachTo: function attachTo(node) {
					const self = this;
					if (node === self) {
						ERROR('Cannot attach to self', self);
						throw new Meteor.Error('cannot-attach-to-self');
					}
					LOG(`Attaching current node (${this._id}) to`, node);
					if (!!self.parentId) {
						ERROR('current-node-already-attached', self);
						throw new Meteor.Error('current-node-already-attached');
					}
					if (!(node instanceof HierarchyNode)) {
						ERROR('invalid-target (not a HierarchyNode)', self);
						throw new Meteor.Error('invalid-target');
					}

					self.getAllDescendants().forEach(item => {
						// update upstreamNodeIdList to include node and its
						// ancestors
						const newUpstreamNodeIdList = item.upstreamNodeIdList.concat([node._id], node.upstreamNodeIdList);
						HierarchyCollection.update({
							_id: item._id
						}, {
							$set: {
								upstreamNodeIdList: newUpstreamNodeIdList
							}
						});

						MaterializedDataCollection.update({
							nodeId: item._id
						}, {
							$set: {
								upstreamNodeIdList: newUpstreamNodeIdList
							}
						});

						PropertyAssignmentCollection.update({
							nodeId: item._id
						}, {
							$set: {
								upstreamNodeIdList: newUpstreamNodeIdList
							}
						});
					});

					const update = {
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
					LOG('Clearing and then regenerating materializations...');
					self._clearMaterializationRecursive();
					self._regenerateMaterializationsRecursive();
				},
				moveTo: function moveTo(node) {
					LOG(`Moving current node (${this._id}) to child list of`, node);
					const self = this;
					if (node === self) {
						ERROR('Cannot attach to self', self);
						throw new Meteor.Error('cannot-attach-to-self');
					}
					self.detach(false);
					self.attachTo(node);
				},
				addPropertyForEntity: function addPropertyForEntity(entityName, property, metadata = {}) {
					const self = this;
					LOG(`Adding property ${property} for entity ${entityName} on`, self);
					const itemData = {
						entityName: entityName,
						nodeId: self._id,
						property: property,
						upstreamNodeIdList: self.upstreamNodeIdList
					};
					const curr = HUP.getPropertyAssignmentItem(itemData);
					if (!!curr) {
						WARN('entity-already-assigned-property-here', self, curr);
						return;
					}
					PropertyAssignmentCollection.insert(_.extend({ metadata: metadata }, itemData));
					MaterializedDataCollection.upsert(itemData, {
						$set: {
							metadata: metadata,
							upstreamDistance: 0
						}
					});

					// materialize for children
					materializeForChildrenWithStopsAtPropertyDefinitions(entityName, property, metadata, self, 0);
				},
				removePropertyForEntity: function removePropertyForEntity(entityName, property) {
					const self = this;
					LOG(`Removing property ${property} for entity ${entityName} on`, self);
					const itemData = {
						entityName: entityName,
						nodeId: self._id,
						property: property,
					};
					const curr = HUP.getPropertyAssignmentItem(itemData);
					if (!curr) {
						WARN('no-such-property-for-entity-here', self, itemData);
						return;
					} else {
						LOG('removing property assignment item', curr);
						PropertyAssignmentCollection.remove(curr);
					}

					// check parent for the same materialized property data
					const parentMPD = HUP.getMaterializedDataItem(_.extend({}, itemData, {
						nodeId: self.parentId
					}));
					LOG('checking parent for the same materialized property data... result:', parentMPD);

					function recursiveMPDUpdate(node, upstreamDistance) {
						// deal with self, then children
						if (typeof upstreamDistance === 'undefined') {
							// remove mode
							LOG(`recursive update [entityName=${entityName}, property=${property}] (remove mode) at`, node);
							MaterializedDataCollection.remove({
								entityName: entityName,
								nodeId: node._id,
								property: property,
							});
						} else {
							// update mode
							LOG(`recursive update [entityName=${entityName}, property=${property}] (update mode) with upstreamDistance=${upstreamDistance} at`, node);
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

						node.getChildren().forEach(child => {
							const _itemData = {
								entityName: entityName,
								property: property,
								nodeId: child._id
							};
							const _materializedDataElem = HUP.getMaterializedDataItem(_itemData);

							if (_materializedDataElem.upstreamDistance !== 0) {
								// only remove/update if upstreamDistance !== 0
								if (typeof upstreamDistance === 'undefined') {
									// remove mode
									recursiveMPDUpdate(child);
								} else {
									// update mode
									recursiveMPDUpdate(child, upstreamDistance + 1);
								}
							} else {
								LOG('recursive update not proceeding (since mpd.upstreamDistance=0) at', child);
							}
						});
					}

					if (!!parentMPD) {
						// if parent has some materialized property data, update materialization on subtree, stopping at those with upstreamDistance = 0
						LOG(`parent has relevant MPD with proximity ${parentMPD.upstreamDistance}`);

						// recursiveMPDUpdate in update mode
						recursiveMPDUpdate(self, parentMPD.upstreamDistance + 1);
					} else {
						// if parent does not have that, remove traces on subtree, stopping at those with upstreamDistance = 0
						LOG('parent does not have relevant MPD');

						// recursiveMPDUpdate in remove mode
						recursiveMPDUpdate(self);
					}
				},
				_clearMaterializationRecursive: function _clearMaterializationRecursive() {
					const self = this;
					MaterializedDataCollection.remove({
						nodeId: self._id,
					});
					self.getChildren().forEach(child => child._clearMaterializationRecursive());
				},
				_regenerateMaterializationsRecursive: function _regenerateMaterializationsRecursive(initialCall = true) {
					const self = this;

					if (initialCall) {
						LOG('_regenerateMaterializationsRecursive initial call');
						if (!!self.parentId) {
							LOG('Parent exists. Checking parent materializations...');
							MaterializedDataCollection.find({
								nodeId: self.parentId
							}).forEach(mpd => {
								propagateMaterializationWithNoStopChecks(self, mpd.entityName, mpd.property, mpd.metadata, mpd.upstreamDistance + 1);
							});
						} else {
							LOG('No parent. (No need to consider parent materializations)');
						}
					}

					PropertyAssignmentCollection.find({
						nodeId: self._id,
					}).forEach(pa => {
						propagateMaterializationWithNoStopChecks(self, pa.entityName, pa.property, pa.metadata);
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
		PackageUtilities.addPropertyGetter(HUP, '_HierarchyCollection', () => HierarchyCollection);
		PackageUtilities.addPropertyGetter(HUP, '_HierarchyCursor', () => HierarchyCollection.find());
		PackageUtilities.addImmutablePropertyFunction(HUP, 'getHierarchyItem', (selector) => !!selector ? HierarchyCollection.findOne(selector) : HierarchyCollection.findOne());
		PackageUtilities.addImmutablePropertyFunction(HUP, 'getHierarchyCursor', (selector) => !!selector ? HierarchyCollection.find(selector) : HierarchyCollection.find());

		if (Meteor.isServer) {
			PackageUtilities.addImmutablePropertyFunction(HUP, 'createHierarchyItem', function createHierarchyItem() {
				const _id = HierarchyCollection.insert({
					parentId: null,
					upstreamNodeIdList: [],
				});
				const item = HierarchyCollection.findOne({
					_id: _id
				});
				LOG('[createHierarchyItem]', item);
				return item;
			});
		}

		if (Meteor.isServer) {
			(function() {
				const entries = [
					[
						['parentId', 1]
					],
					[
						['upstreamNodeIdList', 1]
					]
				];
				_.forEach(entries, entry => {
					INFO(`db.${HierarchyCollection._name}.createIndex({${entry.map(x => `'${x[0]}': ${x[1]}`).join(', ')}});`);
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
		PackageUtilities.addPropertyGetter(HUP, '_PropertyAssignmentCollection', () => PropertyAssignmentCollection);
		PackageUtilities.addPropertyGetter(HUP, '_PropertyAssignmentCursor', () => PropertyAssignmentCollection.find());
		PackageUtilities.addImmutablePropertyFunction(HUP, 'getPropertyAssignmentItem', (selector) => !!selector ? PropertyAssignmentCollection.findOne(selector) : PropertyAssignmentCollection.findOne());
		PackageUtilities.addImmutablePropertyFunction(HUP, 'getPropertyAssignmentCursor', (selector) => !!selector ? PropertyAssignmentCollection.find(selector) : PropertyAssignmentCollection.find());

		if (Meteor.isServer) {
			(function() {
				const entries = [
					[
						['entityName', 1],
						['property', 1]
					],
					[
						['nodeId', 1],
						['property', 1],
					],
					[
						['nodeId', 1],
						['entityName', 1],
					],
					[
						['upstreamNodeIdList', 1]
					]
				];
				_.forEach(entries, entry => {
					INFO(`db.${PropertyAssignmentCollection._name}.createIndex({${entry.map(x => `'${x[0]}': ${x[1]}`).join(', ')}});`);
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
				metadata: Object,
				upstreamDistance: Number
			}
		*/
		MaterializedDataCollection = new Mongo.Collection(materializedDataCollectionName, {
			defineMutationMethods: false
		});
		PackageUtilities.addPropertyGetter(HUP, '_MaterializedDataCollection', () => MaterializedDataCollection);
		PackageUtilities.addPropertyGetter(HUP, '_MaterializedDataCursor', () => MaterializedDataCollection.find());
		PackageUtilities.addImmutablePropertyFunction(HUP, 'getMaterializedDataItem', (selector) => !!selector ? MaterializedDataCollection.findOne(selector) : MaterializedDataCollection.findOne());
		PackageUtilities.addImmutablePropertyFunction(HUP, 'getMaterializedDataCursor', (selector) => !!selector ? MaterializedDataCollection.find(selector) : MaterializedDataCollection.find());

		if (Meteor.isServer) {
			(function() {
				const entries = [
					[
						['entityName', 1]
					],
					[
						['property', 1]
					],
					[
						['nodeId', 1],
						['property', 1],
					],
					[
						['nodeId', 1],
						['entityName', 1],
					],
					[
						['upstreamNodeIdList', 1]
					]
				];
				_.forEach(entries, entry => {
					INFO(`db.${MaterializedDataCollection._name}.createIndex({${entry.map(x => `'${x[0]}': ${x[1]}`).join(', ')}});`);
					MaterializedDataCollection._ensureIndex(_.object(entry));
				});
			}());
		}
	}());

	PackageUtilities.addImmutablePropertyFunction(HUP, '_buildForest', function buildForest() {
		const roots = HierarchyCollection.find({
			parentId: null
		}).fetch();
		roots.forEach(node => node._buildTree());
		return roots;
	});

	return HUP;
};
