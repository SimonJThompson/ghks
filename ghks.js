'use strict';

const github = require('github');

module.exports = class ghks {

	constructor( config ) {

		// Apply default configuration.
		config = Object.assign( {
			name: 'ghdb_example',
			token: null
		}, config );

		// Create and authenticate GitHub API client.
		let client = new github();
		client.authenticate( {
			type: 'token',
			token: config.token.trim()
		} );

		// Set up variables.
		this.cache = {};
		this.config = config;
		this.client = client;
		this.remoteId = false;

		// Bind process exit events.
		process.on( 'autopush', () => {
			this.push().then( function() {
				process.exit();
			} ).catch( error => {
				process.exit();
			} );
		} );
		process.on( 'exit', function () { process.emit( 'autopush' ); } );
		process.on( 'SIGINT', function() { process.emit( 'autopush' ); } );
		process.on( 'SIGTERM', function() { process.emit( 'autopush' ); } );
	}

	/**
	 * Find / create the remote cache.
	 * @return {Promise}
	 */
	init() {
		return new Promise( ( resolve, reject ) => {

			this.client.gists.getAll( {} ).then( ( gists ) => {

				if (
					gists
					&& gists.meta.status == '200 OK'
					&& gists.data && gists.data.length > 0
				) {

					// Loop over all gists, looking for one which matches.
					gists.data.forEach( ( gist ) => {
						if( gist.description == this.config.name ) {

							// Pull the remote cache.
							this.remoteId = gist.id;
							this.pull().then( () => {
								resolve( true );
							}).catch( error => {
								reject( error );
							} );
						}
					} );

					// If there's no gist already, create it.
					if( !this.remoteId ) {

						this.client.gists.create( {
							files: {'cache.json': {'content': '{}'}},
							public: false,
							description: this.config.name
						} ).then( gist => {
							this.remoteId = gist.data.id;
							resolve( true );
						} );
					}
				}else{
					reject( false );
				}
			} ).catch( error => {
				reject( error );
			} );
		} );
	}

	/**
	 * Updates the local store to match the remote (gist) store.
	 * @return {Promise}
	 */
	pull() {
		return new Promise( ( resolve, reject ) => {

			if( this.remoteId ) {

				this.client.gists.get( {id: this.remoteId} ).then( gist => {

					if( gist && gist.data.files['cache.json'] ) {

						// Try and parse the remote
						let remoteCache = JSON.parse( gist.data.files['cache.json'].content );

						if( remoteCache.hasOwnProperty( 'data' ) ) {
							this.cache = remoteCache.data;
						}

						resolve( true );
					}
				} ).catch( function( error ) {
					reject( false );
				} );
			}else{

				// If no remote ID is set, fail.
				reject( false );
			}
		} );
	}

	/**
	 * Updates the remote (gist) store to match the local store.
	 * @return {Promise}
	 */
	push() {
		return new Promise( ( resolve, reject ) => {

			if( this.remoteId ) {

				// Bundle up the local cache into a JSON payload.
				let encodedCache = JSON.stringify( {
					data: this.cache
				} );

				// Write the cache to GitHub.
				this.client.gists.edit( {
					id: this.remoteId,
					files: {'cache.json': {content: encodedCache}}
				} ).then( function() {

					resolve( true );
				} ).catch( function( error ) {

					reject( false );
				} );

			} else {

				// If no remote ID is set, fail.
				reject( false );
			}
		} );
	}

	/**
	 * Set a key/value pair in the local store.
	 * @param {String} key
	 * @param {String} value
	 * @return {Boolean} true
	 */
	set( key, value ) {

		this.cache[key] = value;
		return true;
	}

	/**
	 * Gets value for a key from the local store.
	 * @param {String} key
	 * @return {String} value
	 */
	get( key ) {

		if( this.cache[key] ) {
			return this.cache[key];
		}else {
			return null;
		}
	}

}