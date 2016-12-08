Package.describe({
	name: 'convexset:hierarchical-user-properties',
	version: '0.1.5_1',
	summary: 'Provides support in Meteor for hierarchical user properties',
	git: 'https://github.com/convexset/meteor-hierarchical-user-properties',
	documentation: '../../README.md'
});

Package.onUse(function setupPkg(api) {
	api.use(
		[
			'ecmascript@0.6.1',
			'mongo@1.1.14',
			'dburles:mongo-collection-instances@0.3.5',
			'tmeasday:check-npm-versions@0.3.1'
		]
	);

	api.addFiles('hierarchical-user-properties.js');
	api.export('HierarchicalUserPropertiesFactory');
});
