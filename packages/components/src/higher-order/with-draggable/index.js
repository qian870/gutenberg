/**
 * WordPress Dependencies
 */
import { Component } from '@wordpress/element';
import { compose, createHigherOrderComponent, withSafeTimeout } from '@wordpress/compose';

const dragImageClass = 'components-draggable__invisible-drag-image';
const cloneWrapperClass = 'components-draggable__clone';
const cloneHeightTransformationBreakpoint = 700;
const clonePadding = 20;

const withDraggable = createHigherOrderComponent(
	( OriginalComponent ) => {
		return class extends Component {
			constructor() {
				super( ...arguments );
				this.onDragStart = this.onDragStart.bind( this );
				this.onDragOver = this.onDragOver.bind( this );
				this.onDragEnd = this.onDragEnd.bind( this );
				this.resetDragState = this.resetDragState.bind( this );
			}

			componentWillUnmount() {
				this.resetDragState();
			}

			/**
			 * dragstart event handler.
			 *
			 * @param  {Object} event The Drag event..
			 */
			onDragStart( event ) {
				const { elementId, transferData, onDragStart, setTimeout } = this.props;
				const element = document.getElementById( elementId );
				if ( ! element || ! transferData ) {
					event.preventDefault();
					return;
				}

				// Connect event listeners
				document.addEventListener( 'dragover', this.onDragOver );

				event.dataTransfer.setData( 'text', JSON.stringify( transferData ) );

				// Set a fake drag image to avoid browser defaults. Remove from DOM
				// right after. event.dataTransfer.setDragImage is not supported yet in
				// IE, we need to check for its existence first.
				if ( 'function' === typeof event.dataTransfer.setDragImage ) {
					const dragImage = document.createElement( 'div' );
					dragImage.id = `drag-image-${ elementId }`;
					dragImage.classList.add( dragImageClass );
					document.body.appendChild( dragImage );
					event.dataTransfer.setDragImage( dragImage, 0, 0 );
					document.body.removeChild( dragImage );
				}

				// Prepare element clone and append to element wrapper.
				const elementRect = element.getBoundingClientRect();
				const elementWrapper = element.parentNode;
				const elementTopOffset = parseInt( elementRect.top, 10 );
				const elementLeftOffset = parseInt( elementRect.left, 10 );
				const clone = element.cloneNode( true );
				clone.id = `clone-${ elementId }`;
				this.cloneWrapper = document.createElement( 'div' );
				this.cloneWrapper.classList.add( cloneWrapperClass );
				this.cloneWrapper.style.width = `${ elementRect.width + ( clonePadding * 2 ) }px`;

				if ( elementRect.height > cloneHeightTransformationBreakpoint ) {
					// Scale down clone if original element is larger than 700px.
					this.cloneWrapper.style.transform = 'scale(0.5)';
					this.cloneWrapper.style.transformOrigin = 'top left';
					// Position clone near the cursor.
					this.cloneWrapper.style.top = `${ event.clientY - 100 }px`;
					this.cloneWrapper.style.left = `${ event.clientX }px`;
				} else {
					// Position clone right over the original element (20px padding).
					this.cloneWrapper.style.top = `${ elementTopOffset - clonePadding }px`;
					this.cloneWrapper.style.left = `${ elementLeftOffset - clonePadding }px`;
				}

				// Hack: Remove iFrames as it's causing the embeds drag clone to freeze
				[ ...clone.querySelectorAll( 'iframe' ) ].forEach( ( child ) => child.parentNode.removeChild( child ) );

				this.cloneWrapper.appendChild( clone );
				elementWrapper.appendChild( this.cloneWrapper );

				// Mark the current cursor coordinates.
				this.cursorLeft = event.clientX;
				this.cursorTop = event.clientY;

				// Update cursor to 'grabbing', document wide.
				document.body.classList.add( 'is-dragging-components-draggable' );

				setTimeout( onDragStart );
			}

			/**
			 * Updates positioning of element clone based on mouse movement during dragging.
			 * @param  {Object} event     The non-custom DragEvent.
			 */
			onDragOver( event ) {
				this.cloneWrapper.style.top =
					`${ parseInt( this.cloneWrapper.style.top, 10 ) + event.clientY - this.cursorTop }px`;
				this.cloneWrapper.style.left =
					`${ parseInt( this.cloneWrapper.style.left, 10 ) + event.clientX - this.cursorLeft }px`;

				// Update cursor coordinates.
				this.cursorLeft = event.clientX;
				this.cursorTop = event.clientY;
			}

			/**
			 * Removes the element clone, resets cursor.
			 *
			 * @param { Object } event The DragEvent.
			 */
			onDragEnd( event ) {
				const { onDragEnd, setTimeout } = this.props;
				event.preventDefault();
				this.resetDragState();

				setTimeout( onDragEnd );
			}

			/**
			 * Cleans up drag state when drag has completed, or component unmounts
			 * while dragging.
			 */
			resetDragState() {
				// Remove event listeners
				document.removeEventListener( 'dragover', this.onDragOver );

				// Remove drag clone
				if ( this.cloneWrapper && this.cloneWrapper.parentNode ) {
					this.cloneWrapper.parentNode.removeChild( this.cloneWrapper );
					this.cloneWrapper = null;
				}

				// Reset cursor.
				document.body.classList.remove( 'is-dragging-components-draggable' );
			}

			render() {
				return (
					<OriginalComponent
						{ ...this.props }
						onDragStart={ this.onDragStart }
						onDragEnd={ this.onDragEnd }
					/>
				);
			}
		};
	},
	'withDraggable'
);

export default compose(
	withSafeTimeout,
	withDraggable,
);
