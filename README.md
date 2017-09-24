# ghks

Basic key/value store for Node, using GitHub gists for persistent storage.

## Basic Usage

```js
const ghks = require( './ghks' );

// Create new cache.
let cache = new ghks( {
  name: 'ghdb_example',
  token: '{YOUR_GITHUB_TOKEN}'
} );

cache.init().then( function() {
  cache.set( 'Fruit', 'Apple' );
  cache.set( 'Vegetable', 'Carrot' );
} ).catch( function( error ) { console.error( 'Failed to init cache:', error ); } );
```

## .set(key, value)
Sets the value of a key in the cache.
```js
cache.set( 'MyKey', 'MyValue' );
```

## .get(key)
Gets the value of a key in the cache.
```js
cache.get( 'MyKey' );
```

## .pull()
Pulls the remote cache from the gist - overwrites local cache.
```js
cache.pull().then( function() {
	// Do something.
} );
```

## .push()
Pushes the local cache to the remote gist - overwrites the remote.
```js
cache.push().then( function() {
	// Do something.
} );
```

## Auto-push

ghks will automatically push the local cache to the Gist on certain events.

- process SIGINT
- process SIGTERM