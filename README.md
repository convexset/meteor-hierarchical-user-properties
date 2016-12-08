# HierarchicalUserProperties

The main function of this package is to provide a framework for upward delegation of "properties" (e.g.: responsibilities) in hierarchies on the server-side.

Consider a forest of trees representing hierarchies. Suppose a "property" is assigned to an "entity" on some node. Then it implies that:
 - "property" is assigned to that "entity" on that node with "upstream distance" 0
 - "property" is assigned to that "entity" on the children of that node with "upstream distance" 1
 - "property" is assigned to that "entity" on the children of the children of that node with "upstream distance" 2
 - and so on...
 - if "property" is assigned to that "entity" on a descendant of that node, the "upstream distance" of common descendants of our original node and the aforementioned descendant is the smaller of the two "candidate values"

Note that the usual "top of the pyramid owns everything" functionality can be achieved via the usual types of node children/recursive tree traversal stuff. Here: `node.getRoot()`, `node.getChildren()` and `node.getAllDescendants()`.

## Table of Contents

<!-- MarkdownTOC -->

- [Install](#install)
- [Usage](#usage)
    - [Creating Hierarchy Items](#creating-hierarchy-items)
    - [Getting Items and Cursors](#getting-items-and-cursors)
        - [The "Hierarchy Collection"](#the-hierarchy-collection)
        - [The "Property Assignment Collection"](#the-property-assignment-collection)
        - [The "Materialized Property Data Collection"](#the-materialized-property-data-collection)
    - [Methods on Items from the "Hierarchy Collection"](#methods-on-items-from-the-hierarchy-collection)
- [Advanced Usage: Providing Hierarchical Properties for an Existing Collection](#advanced-usage-providing-hierarchical-properties-for-an-existing-collection)
- [Philosophy](#philosophy)

<!-- /MarkdownTOC -->


## Install

This is available as [`convexset:hierarchical-user-properties`](https://atmospherejs.com/convexset/hierarchical-user-properties) on [Atmosphere](https://atmospherejs.com/). (Install with `meteor add convexset:hierarchical-user-properties`.)

If you get an error message like:
```
WARNING: npm peer requirements not installed:
 - package-utils@^0.2.1 not installed.
          
Read more about installing npm peer dependencies:
  http://guide.meteor.com/using-packages.html#peer-npm-dependencies
```
It is because, by design, the package does not include instances of these from `npm` to avoid repetition. (In this case, `meteor npm install --save package-utils` will deal with the problem.)

See [this](http://guide.meteor.com/using-packages.html#peer-npm-dependencies) or [this](https://atmospherejs.com/tmeasday/check-npm-versions) for more information.

Now, if you see a message like
```
WARNING: npm peer requirements not installed:
underscore@1.5.2 installed, underscore@^1.8.3 needed
```
it is because you or something you are using is using Meteor's cruddy old `underscore` package. Install a new version from `npm`. (And, of course, you may use the `npm` version in a given scope via `require("underscore")`.)


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

The resulting object `HierarchicalUserProperties` may then be used as follows...

### Creating Hierarchy Items

`HierarchicalUserProperties.createHierarchyItem(data = {})`: creates a hierarchy item with no parent node (a root of a new tree) with data `data` (do not include keys `parentId` and `upstreamNodeIdList`, they will be overwritten); also returns the created item

### Getting Items and Cursors

#### The "Hierarchy Collection"

Informal Schema Description:
```javascript
{
    parentId: HierarchyCollection._id,
    upstreamNodeIdList: [HierarchyCollection._id]
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
    upstreamDistance: Number
}
```

`HierarchicalUserProperties.getMaterializedDataItem(selector)`: calls `findOne` on the "materialized property data collection" (returns an object, if any)

`HierarchicalUserProperties.getMaterializedDataCursor(selector)`: calls `find` on the "materialized property data collection" (returns an cursor)


### Methods on Items from the "Hierarchy Collection"

Given a node called `node`...

CRUD Methods:
 - `node.createChild(data = {})`: creates a child on `node` with data `data` (do not include keys `parentId` and `upstreamNodeIdList`, they will be overwritten); also returns the created item
 - `node.getChildren()`: gets all children (direct descendants) of `node` (returns an array)
 - `node.getAllDescendants()`: gets all descendants of `node` (returns an array)
 - `node.removeNode()`: removes `node` and sets parent of the children of `node` to the parent (if any) of `node`
 - `node.removeSubTree()`: removes `node` and all its descendants
 - `node.detach()`: detaches `node` and the sub-tree that it is the root of (`node` becomes a root node)
 - `node.attachTo(otherNode)`: attaches a detached node (or a root node) `node` to `otherNode`, becoming a child of `otherNode`
 - `node.moveTo(otherNode)`: detaches `node` and attaches it to `otherNode` (see `node.detach` and `node.attachTo` above)
 - `node.getRoot()`: gets root of the sub-tree that `node` is in
 
Property Assignment and Materialized Property Data Methods:
 - `node.addPropertyForEntity(entityName, property, metadata)`: adds the property assignment of property `property` on `node` for entity with name `entityName` (`metadata` being an object)
 - `node.removePropertyForEntity(entityName, property)`: removes the property assignment of property `property` on `node` for entity with name `entityName`
 - `node.getPropertyAssignments()`: returns all property assignments on `node`
 - `node.getMaterializedPropertyData()`: returns all implied property information (materialized property data) at `node`
 - `node.getMaterializedPropertyDataDataForEntity(entityName)`: returns all implied property information (materialized property data) at `node` for entity with name `entityName`
 - `node.getMaterializedPropertyDataDataForProperty(property)`: returns all implied property information (materialized property data) at `node` for property with name `property`
 - `node.getPropertiesForEntity_OriginalAssignments(entityName)`: gets property assignments at `node` for entity with name `entityName`
 - `node.getEntitiesWithProperty_OriginalAssignments(property)`: gets property assignments at `node` for property `property`
 - `node.getPropertiesForEntity(entityName)`: gets implied property information (materialized property data) at `node` for entity with name `entityName`
 - `node.getEntitiesWithProperty(property)`: gets implied property information (materialized property data) at `node` for property `property`

## Advanced Usage: Providing Hierarchical Properties for an Existing Collection

Link the relevant ORM prototype to `HierarchicalUserProperties._HierarchyNodePrototype`, and you may use the relevant objects with extended methods. (Remember to set the `hierarchyCollectionName` as described under [Usage](#usage).) For example:

```javascript
const HierarchicalUserProperties = HierarchicalUserPropertiesFactory({
    name: 'MyMagicTree',
    hierarchyCollectionName: 'Tree', // note this name
    propertyAssignmentCollectionName: 'TreePropertyAssignments',
    materializedDataCollectionName: 'TreeMaterializedData'
});

function TreeItem(doc) {
    _.extend(this, doc);
    console.log('[TreeItem Transform]', this);
}

// the said prototype linkage
TreeItem.prototype = Object.create(HierarchicalUserProperties._HierarchyNodePrototype);
TreeItem.prototype.getSelfAndAncestors = function getSelfAndAncestors() {
    return [this._id].concat(this.upstreamNodeIdList);
};

// define the relevant collection with the aforementioned name
const TreeItem = new Mongo.Collection('Tree', {
    transform: doc => new TreeItem(doc),
});
```

Make sure not to attempt to access `HierarchicalUserProperties._HierarchyCollection` before the creation of the collection


## Philosophy

Consider some hierarchy of "things" and think of "entities" as people and "properties" as responsibilities:
 - responsibility for "some thing" means responsibility for all the sub-things that are parts of (descendant nodes) of that "some thing"
 - responsibility for "some thing" does not imply responsibility for the "higher level" things that that "some thing" is part of ("above his pay grade" is an expression that comes to mind)

Here's something more concrete on "who is the appropriate one to take on a responsibility":
 - I want to open the door of Room 2A in Office 2 in Building X. So I need to find someone who has the key, and I want to go to approach the most appropriate person (and not the Building Owner who has the authority to get the key certainly but...)
 - If there is no assigned occupant for Room 2A, I look for an office manager for Office 2; If there is no such office manager, I look for the building manager of Building X
 - But of course, if there were an assigned occupant for Room 2A, it would not be appropriate to go look for an office manager or a building manager
 - ... and, if there were an office manager for Office 2, it would not be appropriate to go hunt for a building manager

Here's something concrete on the whole "above his pay grade" stuff:
 - Consider the above setting, but now someone wants to run an audit of all the rooms in Office 2.
 - It would not be sensible to approach the occupant of Room 2A because his role doesn't encompass that. It is "above his pay grade".