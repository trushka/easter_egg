import * as THREE from 'three';
Object.assign(window.Math, THREE.MathUtils);

export const PI=Math.PI,
	 vec2 = (... args) => new THREE.Vector2(...args),
	 vec3 = (... args) => new THREE.Vector3(...args);

THREE.Vector3.prototype.rotate=function(x,y,z,t){
	return this.applyEuler(new THREE.Euler(x,y,z,t))
};
THREE.Euler.prototype.multiplyScalar=function(val) {
	this._x*=val;
	this._y*=val;
	this.z*= val;
	return this;
};
THREE.Quaternion.prototype.setFromXYZ=function(x,y,z,order,upd) {
	if (!!order===order) upd=order;
	this.setFromEuler(new THREE.Euler(x,y,z,order), upd)
}

THREE.BufferAttribute.prototype.forEach=function(fn, change=true){
	const {itemSize, count, array}=this;
	for (let i = 0, vec=new THREE['Vector'+itemSize](); i < count; i++) {
		fn(vec.fromBufferAttribute(this, i), i);
		if (change) vec.toArray(array, i*itemSize);
	}
	this.needsUpdate=change;
	return this;
}

THREE.BufferGeometry.prototype.computeVertexNormalsFine = function () {

	var index = this.index;
	var attributes = this.attributes;

	if ( attributes.position ) {

		if ( index ) {

			var positions = attributes.position.array;

			if ( attributes.normal === undefined ) {

				this.setAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( positions.length ), 3 ) );

			} else {

				// reset existing normals to zero

				var array = attributes.normal.array;

				for ( var i = 0, il = array.length; i < il; i ++ ) {

					array[ i ] = 0;

				}

			}

			var normals = attributes.normal.array;
			var indices = index.array;

			var vA, vB, vC,  a, b, c;
			var pA = vec3(), pB = vec3(), pC = vec3();
			var cb = vec3(), ab = vec3(), ac = vec3();
			indices.forEach (function( el, i ) {
				if (i%3) return;

				vA = indices[ i + 0 ] * 3;
				vB = indices[ i + 1 ] * 3;
				vC = indices[ i + 2 ] * 3;

				pA.fromArray( positions, vA );
				pB.fromArray( positions, vB );
				pC.fromArray( positions, vC );

				cb.subVectors( pC, pB );
				ab.subVectors( pA, pB );
				ac.subVectors( pA, pC );

				a=ab.angleTo(ac);
				b=ab.angleTo(cb);
				c=Math.PI-a-b;

				cb.cross( ab );

				normals[ vA ] += cb.x*a;
				normals[ vA + 1 ] += cb.y*a;
				normals[ vA + 2 ] += cb.z*a;

				normals[ vB ] += cb.x*b;
				normals[ vB + 1 ] += cb.y*b;
				normals[ vB + 2 ] += cb.z*b;

				normals[ vC ] += cb.x*c;
				normals[ vC + 1 ] += cb.y*c;
				normals[ vC + 2 ] += cb.z*c;

			})

			this.normalizeNormals();

			attributes.normal.needsUpdate = true;

		} else {
			console.warn('indexed only!');
			this.computeVertexNormals()
		}

	}

}
THREE.BufferGeometry.prototype.mergeVertices=function ( tolerance = 1e-4 ) {

	const {
		BufferAttribute,
		InterleavedBuffer,
		Vector3
	} = THREE, geometry=this;

	tolerance = Math.max( tolerance, Number.EPSILON );

	// Generate an index buffer if the geometry doesn't have one, or optimize it
	// if it's already available.
	var hashToIndex = {};
	var indices = geometry.getIndex();
	var positions = geometry.getAttribute( 'position' );
	var vertexCount = indices ? indices.count : positions.count;

	// next value for triangle indices
	var nextIndex = 0;

	// attributes and new attribute arrays
	var attributeNames = Object.keys( geometry.attributes );
	var attrArrays = {};
	var morphAttrsArrays = {};
	var newIndices = [];
	var getters = [ 'getX', 'getY', 'getZ', 'getW' ];

	// initialize the arrays
	for ( var i = 0, l = attributeNames.length; i < l; i ++ ) {

		var name = attributeNames[ i ];

		attrArrays[ name ] = [];

		var morphAttr = geometry.morphAttributes[ name ];
		if ( morphAttr ) {

			morphAttrsArrays[ name ] = new Array( morphAttr.length ).fill().map( () => [] );

		}

	}

	// convert the error tolerance to an amount of decimal places to truncate to
	var decimalShift = Math.log10( 1 / tolerance );
	var shiftMultiplier = Math.pow( 10, decimalShift );
	for ( var i = 0; i < vertexCount; i ++ ) {

		var index = indices ? indices.getX( i ) : i;

		// Generate a hash for the vertex attributes at the current index 'i'
		var hash = '';
		for ( var j = 0, l = attributeNames.length; j < l; j ++ ) {

			var name = attributeNames[ j ];
			var attribute = geometry.getAttribute( name );
			var itemSize = attribute.itemSize;

			for ( var k = 0; k < itemSize; k ++ ) {

				// double tilde truncates the decimal value
				hash += `${ ~ ~ ( attribute[ getters[ k ] ]( index ) * shiftMultiplier ) },`;

			}

		}

		// Add another reference to the vertex if it's already
		// used by another index
		if ( hash in hashToIndex ) {

			newIndices.push( hashToIndex[ hash ] );

		} else {

			// copy data to the new index in the attribute arrays
			for ( var j = 0, l = attributeNames.length; j < l; j ++ ) {

				var name = attributeNames[ j ];
				var attribute = geometry.getAttribute( name );
				var morphAttr = geometry.morphAttributes[ name ];
				var itemSize = attribute.itemSize;
				var newarray = attrArrays[ name ];
				var newMorphArrays = morphAttrsArrays[ name ];

				for ( var k = 0; k < itemSize; k ++ ) {

					var getterFunc = getters[ k ];
					newarray.push( attribute[ getterFunc ]( index ) );

					if ( morphAttr ) {

						for ( var m = 0, ml = morphAttr.length; m < ml; m ++ ) {

							newMorphArrays[ m ].push( morphAttr[ m ][ getterFunc ]( index ) );

						}

					}

				}

			}

			hashToIndex[ hash ] = nextIndex;
			newIndices.push( nextIndex );
			nextIndex ++;

		}

	}

	// Generate typed arrays from new attribute arrays and update
	// the attributeBuffers
	const result = geometry;//.clone();
	for ( var i = 0, l = attributeNames.length; i < l; i ++ ) {

		var name = attributeNames[ i ];
		var oldAttribute = geometry.getAttribute( name );

		var buffer = new oldAttribute.array.constructor( attrArrays[ name ] );
		var attribute = new BufferAttribute( buffer, oldAttribute.itemSize, oldAttribute.normalized );

		result.setAttribute( name, attribute );

		// Update the attribute arrays
		if ( name in morphAttrsArrays ) {

			for ( var j = 0; j < morphAttrsArrays[ name ].length; j ++ ) {

				var oldMorphAttribute = geometry.morphAttributes[ name ][ j ];

				var buffer = new oldMorphAttribute.array.constructor( morphAttrsArrays[ name ][ j ] );
				var morphAttribute = new BufferAttribute( buffer, oldMorphAttribute.itemSize, oldMorphAttribute.normalized );
				result.morphAttributes[ name ][ j ] = morphAttribute;

			}

		}

	}

	// indices

	result.setIndex( newIndices );

	return result;

}
