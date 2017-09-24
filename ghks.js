'use strict';

const github = require('github');

function ghks( config = {} ) {

	// Apply default configuration.
	config = Object.assign( {
		name: 'ghdb_example',
		token: null
	}, config );

	// Create and authenticate GitHub API client.
	let client = new github();
	client.authenticate( {
		type: 'token',
		token: config.token
	} );

	// Set up variables.
	this.cache = {};
	this.config = config;
	this.client = client;
	this.remoteId = false;

	// Bind process exit events.
	let that = this;
	process.on( 'autopush', function() {
		that.push().then( function() {
			process.exit();
		} ).catch( function( error ) {
			process.exit();
		} );
	} );
	process.on( 'exit', function () { process.emit( 'autopush' ); } );
	process.on( 'SIGINT', function() { process.emit( 'autopush' ); } );
	process.on( 'SIGTERM', function() { process.emit( 'autopush' ); } );
};

/**
 * Set a key/value pair in the local store.
 * @param {String} key
 * @param {String} value
 * @return {String} value
 */
ghks.prototype.set = function(key, value) {

	this.cache[key] = value;
	return true;
};

/**
 * Gets value for a key from the local store.
 * @param {String} key
 * @return {String} value
 */
ghks.prototype.get = function(key) {

	if( this.cache[key] ) {
		return this.cache[key];
	}else {
		return null;
	}
};

/**
 * Updates the local store to match the remote (gist) store.
 * @return {Boolean}
 */
ghks.prototype.pull = function() {
	if( !this.remoteId ) return false;

	let that = this;

	this.client.gists.get( {id: this.remoteId} ).then( function( gist ) {

		if( gist && gist.data.files['cache.json'] ) {

			// Try and parse the remote
			let remoteCache = gist.data.files['cache.json'].content;
			remoteCache = JSON.parse( remoteCache );

			if( remoteCache.hasOwnProperty( 'data' ) ) {
				that.cache = remoteCache.data;
			}
		}
	} ).catch( function( error ) {
		console.log( error );
	} );
}

/**
 * Updates the remote (gist) store to match the local store.
 * @return {Promise}
 */
ghks.prototype.push = function() {

	let that = this;

	return new Promise( function( resolve, reject) {

		// If no remote ID is set, fail straight away.
		if( !that.remoteId ) return reject( false );

		// Bundle up the local cache into a JSON payload.
		let encodedCache = JSON.stringify( {
			data: that.cache
		} );

		// Write the cache to GitHub.
		that.client.gists.edit( {
			id: that.remoteId,
			files: {
				'cache.json': {
						content: encodedCache
					}
			}
		} ).then( function() {

			resolve( true );
		} ).catch( function( error ) {

			reject( false );
		} );
	} );
}

/**
 * Find / create the remote cache.
 * @return {Promise}
 */
ghks.prototype.init = function() {

	let that = this;

	return new Promise( function( resolve, reject ) {

		that.client.gists.getAll( {} ).then( function( gists ) {
			if (
				gists
				&& gists.meta.status == '200 OK'
				&& gists.data && gists.data.length > 0
			) {

				// Loop over all gists, looking for one which matches.
				gists.data.forEach( gist => {

					if( gist.description == that.config.name ) {

						that.remoteId = gist.id;
						resolve( true );
					}
				}, that );

				// If there's no gist already, create it.
				if( !that.remoteId ) {
					that.client.gists.create( {
						files: {
							'cache.json': {
								'content': '{}',
							}
						},
						'public': false,
						description: that.config.name
					} ).then( function(gist) {

						that.remoteId = gist.data.id;
						resolve( true );
					} );
				}


			}
		} ).catch( function( error ) {

			reject( error );
		} );
	} );
}

module.exports = ghks;
