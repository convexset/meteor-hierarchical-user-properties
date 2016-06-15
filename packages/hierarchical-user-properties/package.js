Package.describe({
	name: 'convexset:hierarchical-user-properties',
	version: '0.1.3_5',
	summary: 'Provides support in Meteor for hierarchical user properties',
	git: 'https://github.com/convexset/meteor-hierarchical-user-properties',
	documentation: '../../README.md'
});


Package.onUse(function(api) {
	api.versionsFrom('1.3.1');

	api.use(
		[
			'ecmascript',
			'es5-shim',
			'ejson',
			'tmeasday:check-npm-versions@0.3.1'
		]
	);

	api.addFiles('hierarchical-user-properties.js');
	api.export('HierarchicalUserPropertiesFactory');
});


Package.onTest(function(api) {
	api.use(['tinytest', 'ecmascript', 'es5-shim', 'ejson', ]);
	api.use('convexset:hierarchical-user-properties');
	api.addFiles(['tests.js', ]);
	api.addFiles([], 'server');
	api.addFiles([], 'client');
});