# HierarchicalUserProperties

The main function of this package is to provide a framework for upward delegation of "properties" (e.g.: responsibilities) in hierarchies on the server-side.

Consider a forest of trees representing hierarchies. Suppose a "property" is assigned to an "entity" on some node. Then it implies that:
 - "property" is assigned to that "entity" on that node with "upstream proximity" 0
 - "property" is assigned to that "entity" on the children of that node with "upstream proximity" 1
 - "property" is assigned to that "entity" on the children of the children of that node with "upstream proximity" 2
 - and so on...
 - if "property" is assigned to that "entity" on a descendant of that node, the "upstream proximity" of common descendants of our original node and the aforementioned descendant is the smaller of the two "candidate values"


## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Install](#install)
- [Usage](#usage)
  - [Creating Hierarchy Items](#creating-hierarchy-items)
  - [Getting Items and Cursors](#getting-items-and-cursors)
    - [The "Hierarchy Collection"](#the-hierarchy-collection)
    - [The "Property Assignment Collection"](#the-property-assignment-collection)
    - [The "Materialized Property Data Collection"](#the-materialized-property-data-collection)
  - [Methods on Items from the "Hierarchy Collection"](#methods-on-items-from-the-hierarchy-collection)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Install

This is available as [`convexset:hierarchical-user-properties`](https://atmospherejs.com/convexset/hierarchical-user-properties) on [Atmosphere](https://atmospherejs.com/). (Install with `meteor add convexset:hierarchical-user-properties`.)

## Usage

Everything happens server-side. One begins by using calling `HierarchicalUserPropertiesFactory` with an argument of the form:
```javascript
options = {
    name: "Properties",
    hierarchyCollectionName: "convexset_HierarchicalUserProperties_Hierarchies",
    propertyAssignmentCollectionName: "convexset_HierarchicalUserProperties_PropertyAssignments",
    materializedDataCollectionName: "convexset_HierarchicalUserProperties_MaterializedData"
}
```
... for example:
```javascript
HierarchicalUserProperties = HierarchicalUserPropertiesFactory(options);
```
In the options above:
 - `name` gives the name of the hierarchical framework (possibly: `"Properties"`, `"Rights"` or `"Responsibilities"`)
 - `hierarchyCollectionName` gives the collection name for the associated "hierarchy collection"
 - `propertyAssignmentCollectionName` gives the collection name for the associated "property assignment collection"
 - `materializedDataCollectionName` gives the collection name for the associated "materialized property data collection"

The resulting object `HierarchicalUserProperties` may then be used as follows.

### Creating Hierarchy Items

`HierarchicalUserProperties.createHierarchyItem(nodeClass)`: creates a hierarchy item with no parent node (a root of a new tree)
 - `nodeClass`: gives the type of this node (a `String`) which will be the default `nodeClass` for newly created child nodes

### Getting Items and Cursors

#### The "Hierarchy Collection"

Informal Schema Description:
```javascript
{
    parentId: HierarchyCollection._id,
    upstreamNodeIdList: [HierarchyCollection._id],
    nodeClass: String, // default: ""
}
```

`HierarchicalUserProperties.getHierarchyItem(selector)`: calls `findOne` on the "hierarchy collection" (returns an object, if any)

`HierarchicalUserProperties.getHierarchyCursor(selector)`: calls `find` on the "hierarchy collection" (returns an cursor)

#### The "Property Assignment Collection"

Informal Schema Description:
```javascript
{
    nodeId: HierarchyCollection._id,
    entityName: String,
    property: String,
}
```

`HierarchicalUserProperties.getPropertyAssignmentItem(selector)`: calls `findOne` on the "property assignment collection" (returns an object, if any)

`HierarchicalUserProperties.getPropertyAssignmentCursor(selector)`: calls `find` on the "property assignment collection" (returns an cursor)

#### The "Materialized Property Data Collection"

Informal Schema Description:
```javascript
{
    nodeId: HierarchyCollection._id,
    entityName: String,
    property: String,
    upstreamProximity: Number
}
```

`HierarchicalUserProperties.getMaterializedDataItem(selector)`: calls `findOne` on the "materialized property data collection" (returns an object, if any)

`HierarchicalUserProperties.getMaterializedDataCursor(selector)`: calls `find` on the "materialized property data collection" (returns an cursor)


### Methods on Items from the "Hierarchy Collection"

Given a node called `node`:
 - `node.setNodeClass(nodeClass)`: sets `nodeClass` property to `nodeClass`
 - `node.setNodeClassRecursive(nodeClass)`: sets `nodeClass` property to `nodeClass` recursively on sub-tree
 - `node.createChild()`: creates a child (inherits `nodeClass` of `node`)
 - `node.getChildren()`: gets all children (direct descendants) of `node` (returns an array)
 - `node.getAllDescendants()`: gets all descendants of `node` (returns an array)
 - `node.removeNode()`: removes `node` and sets parent of the children of `node` to the parent (if any) of `node`
 - `node.removeSubTree()`: removes `node` and all its descendants
 - `node.detach()`: detaches `node` and the sub-tree that it is the root of (`node` becomes a root node)
 - `node.attachTo(otherNode)`: attaches a detached node (or a root node) `node` to `otherNode`, becoming a child of `otherNode`
 - `node.moveTo(otherNode)`: detaches `node` and attaches it to `otherNode` (see `node.detach` and `node.attachTo` above)
 - `node.getPropertiesForEntity_OriginalAssignments(entityName)`: gets property assignments at `node` for entity with name `entityName`
 - `node.getEntitiesWithProperty_OriginalAssignments(property)`: gets property assignments at `node` for property `property`
 - `node.getPropertiesForEntity(entityName)`: gets implied property information at `node` for entity with name `entityName`
 - `node.getEntitiesWithProperty(property)`: gets implied property information at `node` for property `property`
 - `node.getRoot()`: gets root of the sub-tree that `node` is in
 - `node.addPropertyForEntity(entityName, property)`: adds the property assignment of property `property` on `node` for entity with name `entityName`
 - `node.removePropertyForEntity(entityName, property)`: removes the property assignment of property `property` on `node` for entity with name `entityName`

