( function( $ ) {

	"use strict";

	let JetWooBuilder = {

		init: function() {

			if ( ! window.elementorFrontend || ! window.elementorFrontend.hooks ) {
				return;
			}

			window.elementorFrontend.hooks.addAction(
				'frontend/element_ready/jet-single-images.default',
				function( $scope ) {
					$scope.find( '.jet-single-images__loading' ).remove();
				}
			);

			window.elementorFrontend.hooks.addAction(
				'frontend/element_ready/jet-single-tabs.default',
				function( $scope ) {
					$scope.find( '.jet-single-tabs__loading' ).remove();
				}
			);

			window.elementorFrontend.hooks.addFilter( 'jet-popup/widget-extensions/popup-data', JetWooBuilder.prepareJetPopup );

			$( window ).on( 'jet-popup/render-content/ajax/success', JetWooBuilder.jetPopupLoaded );

			$( document )
				.on( 'wc_update_cart added_to_cart', JetWooBuilder.handleJetPopupWithWCEvents )
				.on( 'jet-filter-content-rendered', function ( _, $scope ) {
					JetWooBuilder.initFilteredContentWidgets( $scope );
				} )
				.on( 'click.JetWooBuilder', '.jet-woo-item-overlay-wrap', JetWooBuilder.handleListingItemClick );

			$( document.body ).on( 'wc_cart_emptied', function () {
				if ( $( '.jet-woo-builder-woocommerce-empty-cart' ).length ) {
					JetWooBuilder.elementorFrontendInit( $( '.jet-woo-builder-woocommerce-empty-cart' ) );
				}
			} );

			$( document ).on( 'jet-ajax-search/show-results/listing', function() {
				$( '.jet-woo-builder-archive-add-to-cart .add_to_cart_button.ajax_add_to_cart' ).on( 'click', function( e ) {
					e.preventDefault();

					let _this = $( this );

					if ( _this.attr( 'data-product_id' ) ) {
						let addToCartData = {};

						$.each( _this[0].dataset, function( key, value ) {
							addToCartData[ key ] = value;
						} );

						_this.prop( 'disabled', true );

						$.ajax( {
							type: 'POST',
							url: wc_add_to_cart_params.wc_ajax_url.toString().replace( '%%endpoint%%', 'add_to_cart' ),
							dataType: 'json',
							data: addToCartData,
							success: function( response ) {
								$( document.body ).trigger( 'wc_fragment_refresh' );
								$( document.body ).trigger( 'added_to_cart' );

								_this.prop( 'disabled', false );
							},
							error: function( xhr, status, error ) {
								_this.prop( 'disabled', false );
							}
						} );
					}
				} );
			} );

		},

		registerWidgetHandler: function( widgetName, callback ) {

			if ( ! window.elementorFrontend || ! window.elementorFrontend.hooks ) {
				$( window ).on( 'elementor/frontend/init', function() {
					if ( window.elementorFrontend && window.elementorFrontend.hooks ) {
						window.elementorFrontend.hooks.addAction(
							'frontend/element_ready/' + widgetName,
							callback
						);
					}
				} );

				return;
			}

			window.elementorFrontend.hooks.addAction(
				'frontend/element_ready/' + widgetName,
				callback
			);
		},

		commonInit: function () {

			if ( window.jetWooBuilderData && window.jetWooBuilderData.single_ajax_add_to_cart ) {
				let $product = $( '.woocommerce div.product' );

				if ( ! $product.hasClass( 'product-type-external' ) ) {
					$( document ).on( 'click.JetWooBuilder', '.single_add_to_cart_button:not(.disabled)', JetWooBuilder.singleProductAjaxAddToCart );
				}
			}

			if ( navigator.userAgent.indexOf('Safari') !== -1 && navigator.userAgent.indexOf('Chrome') === -1 ) {
				document.addEventListener( 'click', function ( event ) {

					if ( event.target.matches( '.add_to_cart_button .button-text' ) ) {
						event.target.parentNode.focus();
					}

					if ( event.target.matches( '.add_to_cart_button' ) || event.target.matches( '.single_add_to_cart_button' ) ) {
						event.target.focus();
					}

				} );
			}

			$( document.body ).bind( 'country_to_state_changing', function ( event, country, wrapper ) {
				setTimeout( function () {
					JetWooBuilder.setAddressFieldsRequiredValidation( wrapper );
				}, 500 );
			} );

		},

		setAddressFieldsRequiredValidation: function ( wrapper ) {

			let $widget = wrapper.closest( '.elementor-element' ),
				settings = JetWooBuilder.getElementorElementSettings( $widget );

			if ( settings && settings.modify_field ) {
				let locale_fields = $.parseJSON( wc_address_i18n_params.locale_fields );

				if ( locale_fields ) {
					$.each( locale_fields, function( key, value ) {

						let fields_ids = value.split( ',' );

						$.each( fields_ids, function ( index, id ) {

							let field = wrapper.find( id.trim() );

							if ( field.length ) {
								if ( field.hasClass( 'jwb-field-required' ) ) {
									JetWooBuilder.fieldIsRequired( field, true );
								} else if ( field.hasClass( 'jwb-field-optional' ) ) {
									JetWooBuilder.fieldIsRequired( field, false );
								}
							}

						} );

					} );
				}

			}

		},

		fieldIsRequired: function ( field, isRequired ) {

			JetWooBuilder.modifyFieldLabelWhitespace( field );

			if ( isRequired ) {
				field.find( 'label .optional' ).remove();
				field.addClass( 'validate-required' );

				if ( 0 === field.find( 'label .required' ).length ) {
					field.find( 'label' ).append( '&nbsp;<abbr class="required" title="' + wc_address_i18n_params.i18n_required_text + '">*</abbr>' );
				}
			} else {
				field.find( 'label .required' ).remove();
				field.removeClass( 'validate-required woocommerce-invalid woocommerce-invalid-required-field' );

				if ( 0 === field.find( 'label .optional' ).length ) {
					field.find( 'label' ).append( '&nbsp;<span class="optional">(' + wc_address_i18n_params.i18n_optional_text + ')</span>' );
				}
			}

		},

		modifyFieldLabelWhitespace: function ( field ) {

			let label = field.find( 'label' ).html();

			if ( label ) {
				field.find( 'label' ).html( label.replace( /&nbsp;/g, '' ).trim() );
			}

		},

		handleInputQuantityValue: function( $scope ) {

			let $eWidget = $scope.closest( '.elementor-widget' ),
				settings = JetWooBuilder.getElementorElementSettings( $eWidget );

			if ( settings && 'yes' === settings.show_quantity ) {
				let $cartForm = $scope.find( 'form.cart' );

				$cartForm.on( 'change', 'input.qty', function() {

					if ( '0' === this.value && ! $( this.form ).hasClass( 'grouped_form' ) ) {
						this.value = '1';
					}

					let $button = $( this.form ).find( 'button[data-quantity]' );

					$button.attr( 'data-quantity', this.value );

					if ( this.max ) {
						if ( +this.value > +this.max ) {
							$button.removeClass( 'ajax_add_to_cart' );
						} else if ( ! $button.hasClass( 'ajax_add_to_cart' ) ) {
							$button.addClass( 'ajax_add_to_cart' );
						}
					}

				} );
			}

		},

		jetPopupLoaded : function( event, popupData){

			if ( ! popupData.data.isJetWooBuilder ) {
				return;
			}

			const $jetPopup = $( '#' + popupData.data.popupId );

			$jetPopup.addClass( 'woocommerce product single-product quick-view-product' );
			$jetPopup.find( '.jet-popup__container-content' ).addClass( 'product' );

			setTimeout( function() {
				$( window ).trigger( 'resize' );

				$( '.jet-popup .variations_form' ).each( function() {
					$( this ).wc_variation_form();
				} );

				$( '.jet-popup .woocommerce-product-gallery.images' ).each( function() {
					$( this ).wc_product_gallery();
				} );
			}, 300 );

		},

		prepareJetPopup: function( popupData, widgetData, $scope, event ) {

			if ( widgetData['is-jet-woo-builder'] ) {
				let $product;

				popupData['isJetWooBuilder'] = true;
				popupData['templateId'] = widgetData['jet-woo-builder-qv-template'];

				if ( $scope.hasClass( 'elementor-widget-jet-woo-products' ) || $scope.hasClass( 'elementor-widget-jet-woo-products-list' ) ) {
					$product = $( event.target ).parents( '.jet-woo-builder-product' );
				} else {
					$product = $scope.parents( '.jet-woo-builder-product' );
				}

				if ( $product.length ) {
					popupData['productId'] = $product.data( 'product-id' );
				}
			}

			return popupData;

		},

		mobileHoverOnTouch: function( $item, thumbnail ) {
			if ( 'undefined' !== typeof window.ontouchstart ) {
				$item.each( function() {

					let $this = $( this ),
						$thumbnailLink = $this.find( thumbnail + ' a' ),
						$adjacentItems = $this.siblings();

					if ( $this.hasClass( 'jet-woo-products__item' ) ) {
						let $itemContent = $this.not( thumbnail );

						$itemContent.each( function() {
							let $currentItem = $( this );

							JetWooBuilder.mobileTouchEvent( $this, $currentItem, $adjacentItems );
						} );
					}

					JetWooBuilder.mobileTouchEvent( $this, $thumbnailLink, $adjacentItems );

				} );
			}
		},

		mobileTouchEvent: function( $target, $item, $adjacentItems ) {
			$item.on( 'click', function( event ) {
				if ( ! $target.hasClass( 'mobile-hover' ) ) {
					event.preventDefault();

					$adjacentItems.each( function() {
						if ( $( this ).hasClass( 'mobile-hover' ) ) {
							$( this ).removeClass( 'mobile-hover' );
						}
					} );

					$target.addClass( 'mobile-hover' );
				}
			} );
		},

		initCarousel: function( $target, options ) {

			let $eWidget = $target.closest( '.elementor-widget' ),
				slidesCount = $target.find( '.swiper-slide' ).length,
				settings = JetWooBuilder.getElementorElementSettings( $eWidget ),
				eBreakpoints = window.elementorFrontend.config.responsive.activeBreakpoints,
				defaultOptions = {},
				slidesToShow = +settings.columns || 4,
				slideOverflow = settings.slides_overflow_enabled && settings.slides_overflow ? +settings.slides_overflow : 0,
				spaceBetween = undefined !== settings.space_between_slides ? +settings.space_between_slides : 10,
				defaultSlidesToShowMap = {
					mobile: 1,
					tablet: 2
				};

			defaultOptions = {
				slidesPerView: slidesToShow + slideOverflow,
				spaceBetween: spaceBetween,
				crossFade: 'fade' === options.effect,
				handleElementorBreakpoints: true
			}

			defaultOptions.breakpoints = {};

			let lastBreakpointSlidesToShowValue = slidesToShow;

			Object.keys( eBreakpoints ).reverse().forEach( breakpointName => {

				const defaultSlidesToShow = defaultSlidesToShowMap[ breakpointName ] ? defaultSlidesToShowMap[ breakpointName ] : lastBreakpointSlidesToShowValue;
				const bpSlidesToShow = +settings[ 'columns_' + breakpointName ] || defaultSlidesToShow;
				const bpSlideOverflow = settings.slides_overflow_enabled && settings[ 'slides_overflow_' + breakpointName ] ? +settings[ 'slides_overflow_' + breakpointName ] : slideOverflow;

				defaultOptions.breakpoints[ eBreakpoints[ breakpointName ].value ] = {
					slidesPerView: bpSlidesToShow + bpSlideOverflow,
					slidesPerGroup: +settings[ 'slides_to_scroll_' + breakpointName ] || options.slidesPerGroup,
					spaceBetween: undefined !== settings['space_between_slides_' + breakpointName] ? +settings['space_between_slides_' + breakpointName] : spaceBetween
				};

				lastBreakpointSlidesToShowValue = +settings[ 'columns_' + breakpointName ] || defaultSlidesToShow;

			} );

			if ( options.paginationEnable ) {
				defaultOptions.pagination = {
					el: '.swiper-pagination',
					clickable: true,
					dynamicBullets: options.dynamicBullets
				}
			}

			if ( options.navigationEnable ) {
				defaultOptions.navigation = {
					nextEl: '.jet-swiper-button-next',
					prevEl: '.jet-swiper-button-prev',
				}
			}

			let currentDeviceSlidePerView = +settings[ 'columns_' + elementorFrontend.getCurrentDeviceMode() ] || +settings['columns'];

			if ( slidesCount > currentDeviceSlidePerView ) {
				const Swiper = elementorFrontend.utils.swiper;

				new Swiper( $target, $.extend( {}, defaultOptions, options ) ).then( swiper => {
					$( document ).trigger( 'jet-woo-builder-swiper-initialized', swiper );

					if ( 'vertical' === options.direction && options.paginationEnable && options.dynamicBullets ) {
						$target.find( '.swiper-pagination' ).css( 'width', $target.find( '.swiper-pagination-bullet-active' ).width() );
					}
				} );

				$target.find( '.jet-arrow' ).show();
			} else if ( options.direction === 'vertical' ) {
				$target.addClass( 'swiper-container-vertical' );
				$target.find( '.jet-arrow' ).hide();
			} else {
				$target.find( '.jet-arrow' ).hide();
			}

		},

		handleJetPopupWithWCEvents: function ( event, fragments, hash, button ) {

			let popupWrapper = $( button ).closest( '.jet-popup' );

			if ( popupWrapper.length && popupWrapper.hasClass( 'quick-view-product' ) ) {
				$( window ).trigger( {
					type: 'jet-popup-close-trigger',
					popupData: {
						popupId: popupWrapper.attr( 'id' ),
						constantly: false
					}
				} );
			}

			let purchasePopupData = $( button ).closest( '[data-purchase-popup-id]' );

			if ( purchasePopupData.length ) {
				let popupId = purchasePopupData.data( 'purchase-popup-id' );

				if ( popupId ) {
					$( window ).trigger( {
						type: 'jet-popup-open-trigger',
						popupData: window.JetPlugins.hooks.applyFilters( 'jet-woo-builder.purchase-popup.data', {
							popupId: 'jet-popup-' + popupId
						}, event, fragments, hash, button )
					} );
				}
			}

		},

		singleProductAjaxAddToCart: function( event ) {

			if ( event ) {
				event.preventDefault();
			}

			let $form = $( this ).closest('form');

			if( ! $form[0].checkValidity() ) {
				$form[0].reportValidity();

				return false;
			}

			let $thisBtn = $( this ),
				product_id = $thisBtn.val() || '',
				cartFormData = $form.serialize();

			$.ajax( {
				type: 'POST',
				url: window.jetWooBuilderData.ajax_url,
				data: 'action=jet_woo_builder_add_cart_single_product&add-to-cart=' + product_id + '&' + cartFormData,
				beforeSend: function () {
					$thisBtn.removeClass( 'added' ).addClass( 'loading' );
				},
				complete: function () {
					$thisBtn.addClass( 'added' ).removeClass( 'loading' );
				},
				success: function ( response ) {

					if ( ! response ) {
						return;
					}

					if ( response.error && response.product_url ) {
						window.location = response.product_url;

						return;
					}

					if ( 'undefined' === typeof wc_add_to_cart_params ) {
						return;
					}

					$( document.body ).trigger( 'wc_fragment_refresh' );
					$( document.body ).trigger( 'added_to_cart', [ response.fragments, response.cart_hash, $thisBtn ] );

					$( '.woocommerce-notices-wrapper' ).html( response.fragments.notices_html );

				},
			} );

			return false;

		},

		handleListingItemClick: function ( event ) {

			let url = $( this ).data( 'url' ),
				target = $( this ).data( 'target' ) || false;

			if ( url ) {
				event.preventDefault();

				if (
					(window.elementorFrontend && window.elementorFrontend.isEditMode())
					|| $( event.target ).parents( '.jet-compare-button__link' ).length
					|| $( event.target ).parents( '.jet-wishlist-button__link' ).length
					|| $( event.target ).parents( '.jet-quickview-button__link' ).length
				) {
					return;
				}

				if ( '_blank' === target ) {
					window.open( url );
					return;
				}

				window.location = url;
			}

		},

		getElementorElementSettings: function( $scope ) {

			if ( window.elementorFrontend && window.elementorFrontend.isEditMode() && $scope.hasClass( 'elementor-element-edit-mode' ) ) {
				return JetWooBuilder.getEditorElementSettings( $scope );
			}

			return $scope.data( 'settings' ) || {};

		},

		getEditorElementSettings: function( $scope ) {

			let modelCID = $scope.data( 'model-cid' ),
				elementData;

			if ( ! modelCID ) {
				return {};
			}

			if ( ! window.elementorFrontend.hasOwnProperty( 'config' ) ) {
				return {};
			}

			if ( ! window.elementorFrontend.config.hasOwnProperty( 'elements' ) ) {
				return {};
			}

			if ( ! window.elementorFrontend.config.elements.hasOwnProperty( 'data' ) ) {
				return {};
			}

			elementData = window.elementorFrontend.config.elements.data[ modelCID ];

			if ( ! elementData ) {
				return {};
			}

			return elementData.toJSON();

		},

		initFilteredContentWidgets: function( $content ) {

			if ( ! window.elementorFrontend || ! window.elementorFrontend.hooks ) {
				return;
			}

			let widgetTypes = [
				'jet-woo-products.default',
				'jet-woo-products-list.default',
				'jet-woo-builder-archive-add-to-cart.default',
				'jet-woo-categories.default',
				'jet-cart-table.default',
				'jet-woo-builder-products-loop.default',
			];

			widgetTypes.forEach( function( widgetType ) {
				$content
					.find( '[data-widget_type="' + widgetType + '"]' )
					.addBack( '[data-widget_type="' + widgetType + '"]' )
					.each( function() {
						window.elementorFrontend.hooks.doAction( 'frontend/element_ready/' + widgetType, $( this ), $ );
					} );
			} );

		},

		elementorFrontendInit: function( $content ) {

			if ( ! window.elementorFrontend || ! window.elementorFrontend.hooks ) {
				return;
			}

			$content.find( '[data-element_type]' ).each( function() {

				let $this       = $( this ),
					elementType = $this.data( 'element_type' );

				if ( ! elementType ) {
					return;
				}

				if ( 'widget' === elementType ) {
					elementType = $this.data( 'widget_type' );

					window.elementorFrontend.hooks.doAction( 'frontend/element_ready/widget', $this, $ );
				}

				window.elementorFrontend.hooks.doAction( 'frontend/element_ready/global', $this, $ );
				window.elementorFrontend.hooks.doAction( 'frontend/element_ready/' + elementType, $this, $ );

			} );

		}

	};

	$( window ).on( 'elementor/frontend/init', JetWooBuilder.init );

	JetWooBuilder.commonInit();

	window.JetWooBuilder = JetWooBuilder;

} ( jQuery ) );