
///////////////////////////////////////////////////////
// 3d Matrix Functions
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	/**
	 * Matrix object for creating matrices relevant for 3d Transformations
	 * @var Object
	 */
	if (typeof($.matrix) == 'undefined') {
		$.extend({
			matrix: {}
		});
	}
	
	$.extend( $.matrix, {
		/**
		 * Matrix
		 * @return Matrix
		 */
		matrix3d: function() {
			var args = Array.prototype.slice.call(arguments);
			// arguments are in column-major order
			return new $.matrix.M4x4(
				args[0], args[4], args[8], args[12],
				args[1], args[5], args[9], args[13],
				args[2], args[6], args[10], args[14],
				args[3], args[7], args[11], args[15]
			);
		},
		
		/**
		 * Perspective
		 * @param Number ez depth in pixels
		 * @param Number ex translation in pixels
		 * @param Number ey translation in pixels
		 * @return Matrix
		 */
		perspective: function(ez, ex, ey) {
			if (ez < 0) {
				return;
			}
			ex = ex ? ex : 0;
			ey = ey ? ey : 0;
			
			d = -1/ez;
			
			return new $.matrix.M4x4(
				1, 0, 0, -ex,
				0, 1, 0, -ey,
				0, 0, 1, 0,
				0, 0, d, 1
			);
		},
		
		/**
		 * Reflect across the Z-axis (???)
		 * @return Matrix
		 */
		reflectZ: function() {
			return new $.matrix.M3x3(
				1, 0,  0,
				0, 1,  0,
				0, 0, -1
			);
		},
		
		/**
		 * Rotates around the X-Axis
		 * @param Number deg
		 * @return Matrix
		 */
		rotateX: function(deg) {
			//TODO: detect units
			var rad = $.angle.degreeToRadian(deg),
				costheta = Math.cos(rad),
				sintheta = Math.sin(rad);
			
			var a = costheta,
				b = sintheta,
				c = -sintheta,
				d = costheta;
				
			return new $.matrix.M3x3(
				1, 0, 0,
				0, a, c,
				0, b, d
			);
		},
		
		/**
		 * Rotates around the Y-Axis
		 * @param Number deg
		 * @return Matrix
		 */
		rotateY: function(deg) {
			//TODO: detect units
			var rad = $.angle.degreeToRadian(deg),
				costheta = Math.cos(rad),
				sintheta = Math.sin(rad);
			
			var a = costheta,
				b = sintheta,
				c = -sintheta,
				d = costheta;
				
			return new $.matrix.M3x3(
				a, 0, b,
				0, 1, 0,
				c, 0, d
			);
		
		},
		
		/**
		 * Rotates around the Z-Axis
		 * @param Number deg
		 * @return Matrix
		 */
		rotateZ: function(deg) {
			//TODO: detect units
			var rad = $.angle.degreeToRadian(deg),
				costheta = Math.cos(rad),
				sintheta = Math.sin(rad);
			
			var a = costheta,
				b = sintheta,
				c = -sintheta,
				d = costheta;
				
			return new $.matrix.M3x3(
				a, c, 0,
				b, d, 0,
				0, 0, 1
			);
		
		},
		
		/**
		 * Rotate around a vector
		 * @param Number x
		 * @param Number y
		 * @param Number z
		 * @param Number deg
		 * @return Matrix
		 */
		rotate3d: function(x, y, z, deg) {
			//TODO: detect units
			var rad = $.angle.degreeToRadian(deg),
				costheta = Math.cos(rad),
				sintheta = Math.sin(rad);
			
			var a = 1 + (1 - costheta) * (x * x - 1),
				b = z * sintheta + (1 - costheta) * x * y,
				c = -y * sintheta + (1 - costheta) * x * z,
				d = -z * sintheta + (1 - costheta) * x * y,
				e = 1 + (1 - costheta) * (y * y - 1),
				f = x * sintheta + (1 - costheta) * y * z,
				g = y * sintheta + (1 - costheta) * x * z,
				h = -x * sintheta + (1 - costheta) * y * z,
				i = 1 + (1 - costheta) * (z * z - 1);
					
			return new $.matrix.M3x3(
				a, b, c,
				d, e, f,
				g, h, i				
			);
		},
		
		/**
		 * Scale
		 * @param Number sx
		 * @param Number sy
		 * @return Matrix
		 */
		scale3d: function(sx, sy, sz) {
			sx = sx || sx === 0 ? sx : 1;
			sy = sy || sy === 0 ? sy : sx;
			sz = sz || sz === 0 ? sz : sx;
			
			return new $.matrix.M3x3(
				sx, 0, 0,
				0, sy, 0,
				0,  0, sz
			);
		},
		
		/**
		 * Scale on the X-axis
		 * @param Number sx
		 * @return Matrix
		 */
		scaleX: function(sx) {
			return $.matrix.scale3d(sx, 1, 1);
		},
		
		/**
		 * Scale on the Y-axis
		 * @param Number sy
		 * @return Matrix
		 */
		scaleY: function(sy) {
			return $.matrix.scale3d(1, sy, 1);
		},
		
		/**
		 * Scale on the Z-axis
		 * @param Number sz
		 * @return Matrix
		 */
		scaleZ: function(sz) {
			return $.matrix.scale3d(1, 1, sz);
		},
		
		/**
		 * Translates
		 * @param Number tx
		 * @param Number ty
		 * @param Number tz
		 * @return Matrix
		 */
		translate3d: function(tx, ty, tz) {
			tx = tx ? tx : 0;
			ty = ty ? ty : 0;
			tz = tz ? tz : 0;
			
			return new $.matrix.M4x4(
				1, 0, 0, tx,
				0, 1, 0, ty,
				0, 0, 1, tz,
				0, 0, 0, 1
			);
		},
		
		/**
		 * Translates on the X-Axis
		 * @param Number tx
		 * @return Matrix
		 */
		translateX: function(tx) {
			return $.matrix.translate3d(tx);
		},
		
		/**
		 * Translates on the Y-Axis
		 * @param Number ty
		 * @return Matrix
		 */
		translateY: function(ty) {
			return $.matrix.translate3d(0, ty);
		},
		
		/**
		 * Translates on the Z-Axis
		 * @param Number tz
		 * @return Matrix
		 */
		translateZ: function(tz) {
			return $.matrix.translate3d(0, 0, tz);
		}
	});
})(jQuery, this, this.document);