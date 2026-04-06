

$(function () {

  /* PRODUCT CATALOG JSON */

  const productCatalog = [];

  $('#product-list article').each(function () {
    const $el = $(this);
    productCatalog.push({
      id:       $el.data('product-id'),
      type:     $el.data('product-type'),
      name:     $el.data('product-name'),
      price:    parseFloat($el.data('product-price')),
      currency: $el.data('product-currency') || 'USD',
      stock:    parseInt($el.data('stock'), 10)
    });
  });

  console.log('=== Conference 2026 - Product Catalog JSON ===');
  console.log(JSON.stringify(productCatalog, null, 2));


  /* CART STATE */

  const TAX_RATE       = parseFloat($('#cart-tax').data('tax-rate')) || 0.08625;
  let   cartIdCounter  = 10;   // incremented whenever a new row is added

  const cart = [];

  // Seed from existing HTML rows
  $('#cart-body tr').each(function () {
    const $row = $(this);

    // Pull the product name from the th cell, stripping the <small> child
    const $nameCell = $row.find('th[scope="row"]').clone();
    $nameCell.find('small').remove();
    const productName = $nameCell.text().trim();

    cart.push({
      cartItemId:  $row.data('cart-item-id'),
      productId:   $row.data('product-id'),
      productType: $row.data('product-type'),
      productName: productName,
      unitPrice:   parseFloat($row.data('unit-price')),
      currency:    $row.data('currency') || 'USD',
      quantity:    parseInt($row.find('input[name="quantity"]').val(), 10) || 1,
      details:     {}
    });
  });

  console.log('=== Cart State (seeded from HTML) ===');
  console.log(JSON.stringify(cart, null, 2));


  /* HELPER UTILITIES */

  /** Format a number as a USD price string: 49 → "$49.00" */
  function fmt(amount) {
    return '$' + parseFloat(amount).toFixed(2);
  }

  /** Recalculate subtotal, tax, and total; update every display element. */
  function recalcTotals() {
    // --- Compute figures ---
    let subtotal = 0;
    cart.forEach(function (item) {
      subtotal += item.unitPrice * item.quantity;
    });
    const tax   = subtotal * TAX_RATE;
    const total = subtotal + tax;

    // --- Cart table footer ---
    $('#cart-subtotal').text(fmt(subtotal)).data('subtotal', subtotal.toFixed(2));
    $('#cart-tax').text(fmt(tax));
    $('#cart-total').html('<strong>' + fmt(total) + '</strong>');

    // --- Header cart badge ---
    const itemCount = cart.reduce(function (acc, item) {
      return acc + item.quantity;
    }, 0);
    $('#header-cart-count').text(itemCount);

    // --- "N items in your cart" label ---
    const label = itemCount === 1 ? '1 item in your cart' : itemCount + ' items in your cart';
    $('#cart-item-count').text(label);

    // --- Place-order button label ---
    $('#place-order-btn').text('Place Order — ' + fmt(total) + ' USD');

    // --- Hidden checkout fields ---
    $('#checkout-subtotal').val(subtotal.toFixed(2));
    $('#checkout-tax').val(tax.toFixed(2));
    $('#checkout-order-total').val(total.toFixed(2));
    $('#checkout-cart-snapshot').val(JSON.stringify(cart));

    // --- Show / hide empty-cart message ---
    if (cart.length === 0) {
      $('#cart-contents').hide();
      $('#cart-empty-message').removeAttr('hidden').show();
    } else {
      $('#cart-contents').show();
      $('#cart-empty-message').hide();
    }

    // --- Sync checkout order summary ---
    syncCheckoutSummary(subtotal, tax, total);
    localStorage.setItem("conferenceCart", JSON.stringify(cart));
  }

  /** Rebuild the checkout order-summary table from current cart state. */
  function syncCheckoutSummary(subtotal, tax, total) {
    const $tbody = $('#checkout-summary-table tbody');
    $tbody.empty();

    cart.forEach(function (item) {
      const lineTotal = item.unitPrice * item.quantity;
      let detailStr = '';
      if (item.details && Object.keys(item.details).length) {
        detailStr = ' - ' + Object.values(item.details).join(' / ');
      }
      $tbody.append(
        '<tr>' +
          '<td>' + item.productName + detailStr + ' (' + item.productId + ')' + '</td>' +
          '<td>' + item.quantity + '</td>' +
          '<td>' + fmt(lineTotal) + '</td>' +
        '</tr>'
      );
    });

    // Update tfoot cells
    $('#checkout-summary-table tfoot tr').eq(0).find('td').text(fmt(subtotal));
    $('#checkout-summary-table tfoot tr').eq(1).find('td').text(fmt(tax));
    $('#checkout-summary-table tfoot tr').eq(2).find('td')
      .html('<strong>' + fmt(total) + ' USD</strong>');
  }

  /**
    Build the HTML string for a new cart table row.
    Mirrors the static structure already in the HTML so
    the delegate event listeners on #cart-body keep working.
   */
  function buildCartRow(item) {
    const lineTotal  = item.unitPrice * item.quantity;
    const endpoint   = '/api/v1/cart/items/' + item.cartItemId;
    const qtyInputId = 'cart-qty-' + item.productId;

    return (
      '<tr ' +
          'id="cart-row-'        + item.productId   + '" ' +
          'data-cart-item-id="'  + item.cartItemId  + '" ' +
          'data-product-id="'    + item.productId   + '" ' +
          'data-product-type="'  + item.productType + '" ' +
          'data-unit-price="'    + item.unitPrice   + '" ' +
          'data-currency="'      + item.currency    + '">' +

        '<th scope="row">' +
          item.productName + '<br>' +
          '<small>' + item.productType + ' · ' + item.productId + '</small>' +
        '</th>' +

        '<td></td>' +

        '<td data-unit-price-display>' + fmt(item.unitPrice) + '</td>' +

        /* Quantity-update form (PATCH) */
        '<td>' +
          '<form method="post" action="#cart" ' +
               'data-ajax-endpoint="' + endpoint + '" ' +
               'data-ajax-method="PATCH">' +
            '<input type="hidden" name="_method"      value="PATCH">' +
            '<input type="hidden" name="cart_item_id" value="' + item.cartItemId + '">' +
            '<input type="hidden" name="product_id"   value="' + item.productId + '">' +
            '<label for="' + qtyInputId + '">Quantity</label>' +
            '<input type="number" id="' + qtyInputId + '" name="quantity" ' +
                   'value="' + item.quantity + '" min="1" max="99" step="1">' +
            '<button type="submit" name="action" value="update-qty">Update</button>' +
          '</form>' +
        '</td>' +

        '<td data-line-total-display>' + fmt(lineTotal) + '</td>' +

        /* Remove form (DELETE) */
        '<td>' +
          '<form method="post" action="#cart" ' +
               'data-ajax-endpoint="' + endpoint + '" ' +
               'data-ajax-method="DELETE">' +
            '<input type="hidden" name="_method"      value="DELETE">' +
            '<input type="hidden" name="cart_item_id" value="' + item.cartItemId + '">' +
            '<input type="hidden" name="product_id"   value="' + item.productId + '">' +
            '<button type="submit" name="action" value="remove">Remove</button>' +
          '</form>' +
        '</td>' +
      '</tr>'
    );
  }


  /* SEARCH & FILTER (jQuery) */

  function applyFilters() {
    const query        = $('#search-query').val().toLowerCase().trim();
    const category     = $('#filter-category').val();
    const priceRange   = $('#filter-price').val();
    const availability = $('#filter-availability').val();
    const sortBy       = $('#sort-by').val();

    const matched = [];

    $('#product-list > li').each(function () {
      const $li      = $(this);
      const $article = $li.find('article');
      const name     = ($article.data('product-name') || '').toLowerCase();
      const type     = ($article.data('product-type') || '').toLowerCase();
      const price    = parseFloat($article.data('product-price')) || 0;
      const stock    = parseInt($article.data('stock'), 10);

      // --- Keyword ---
      if (query && name.indexOf(query) === -1 && type.indexOf(query) === -1) {
        $li.hide();
        return; // continue .each()
      }

      // --- Category ---
      if (category && type !== category) {
        $li.hide();
        return;
      }

      // --- Price range ---
      if (priceRange) {
        let pricePass = true;
        switch (priceRange) {
          case 'free':    pricePass = price === 0;               break;
          case '0-25':    pricePass = price > 0 && price < 25;   break;
          case '25-75':   pricePass = price >= 25 && price < 75;  break;
          case '75-150':  pricePass = price >= 75 && price < 150; break;
          case '150+':    pricePass = price >= 150;               break;
        }
        if (!pricePass) { $li.hide(); return; }
      }

      // --- Availability ---
      if (availability) {
        let availPass = true;
        switch (availability) {
          case 'in-stock':     availPass = stock > 3;           break;
          case 'low-stock':    availPass = stock > 0 && stock <= 3; break;
          case 'out-of-stock': availPass = stock === 0;          break;
        }
        if (!availPass) { $li.hide(); return; }
      }

      $li.show();
      matched.push({ el: $li[0], name: name, price: price, stock: stock });
    });

    // --- Sort matched items ---
    if (sortBy && matched.length > 1) {
      matched.sort(function (a, b) {
        switch (sortBy) {
          case 'name-asc':    return a.name.localeCompare(b.name);
          case 'name-desc':   return b.name.localeCompare(a.name);
          case 'price-asc':   return a.price - b.price;
          case 'price-desc':  return b.price - a.price;
          case 'availability':return b.stock - a.stock;
          default:            return 0;
        }
      });
      const $list = $('#product-list');
      matched.forEach(function (m) { $list.append(m.el); });
    }

    // --- Update the result count label ---
    const $header = $('#product-catalog header p').last();
    if (matched.length < productCatalog.length) {
      $header.text(
        'Showing ' + matched.length + ' of ' + productCatalog.length + ' products (filtered)'
      );
    } else {
      $header.text('Showing ' + productCatalog.length + ' products');
    }
  }

  // Live filter on every keystroke
  $('#search-query').on('input', applyFilters);

  // Live filter on any dropdown change
  $('#filter-category, #filter-price, #filter-availability, #sort-by').on('change', applyFilters);

  // Form submit — prevent default navigation, run filter, scroll to results
  $('#product-search-form').on('submit', function (e) {
    e.preventDefault();
    applyFilters();
    $('html, body').animate(
      { scrollTop: $('#product-catalog').offset().top - 20 },
      400
    );
  });

  // "Clear" link — reset the form and show all products
  $(document).on('click', 'a[href="#product-search"]', function () {
    $('#product-search-form')[0].reset();
    $('#product-list > li').show();
    $('#product-catalog header p').last()
      .text('Showing ' + productCatalog.length + ' products');
  });


  /* ADD TO CART */

  $(document).on('submit', '#product-list form', function (e) {
    e.preventDefault();
    const $form    = $(this);
    const $article = $form.closest('article');

    // Read product data
    const productId   = $form.find('[name="product_id"]').val();
    const productType = $form.find('[name="product_type"]').val();
    const productName = $form.find('[name="product_name"]').val();
    const unitPrice   = parseFloat($form.find('[name="unit_price"]').val());
    const currency    = $form.find('[name="currency"]').val() || 'USD';
    const quantity    = parseInt($form.find('[name="quantity"]').val(), 10) || 1;
    const stock       = parseInt($article.data('stock'), 10);

    // Sold-out guard
    if (stock === 0) {
      showFeedback($form, 'This item is sold out.', 'error');
      return;
    }

    // Validate any required <select> extras (size, colour, pass_day)
    let   valid   = true;
    const details = {};

    $form.find('select').each(function () {
      const $sel = $(this);
      const val  = $sel.val();

      if ($sel.prop('required') && !val) {
        // Derive a readable label from the associated <label>
        const labelText = $('label[for="' + $sel.attr('id') + '"]')
                            .text()
                            .replace(/\*/g, '')
                            .trim();
        showFeedback($form, 'Please select a ' + labelText + '.', 'error');
        valid = false;
        return false; // break .each()
      }
      if (val) {
        details[$sel.attr('name')] = val;
      }
    });

    if (!valid) return;

    // Check if the same product + same detail combination is already in the cart
    const detailKey = JSON.stringify(details);
    const existing  = cart.find(function (item) {
      return (
        item.productId === productId &&
        JSON.stringify(item.details) === detailKey
      );
    });

    if (existing) {
      // Increment existing row
      const newQty = existing.quantity + quantity;
      if (stock !== 999 && newQty > stock) {
        showFeedback(
          $form,
          'Only ' + stock + ' units available. You already have ' +
            existing.quantity + ' in your cart.',
          'error'
        );
        return;
      }
      existing.quantity = newQty;
      const $row = $('#cart-row-' + productId);
      $row.find('[name="quantity"]').val(newQty);
      $row.find('[data-line-total-display]').text(fmt(existing.unitPrice * newQty));

    } else {
      // New cart item
      cartIdCounter++;
      const cartItemId = 'cart-item-' + String(cartIdCounter).padStart(3, '0');
      const newItem    = {
        cartItemId,
        productId,
        productType,
        productName,
        unitPrice,
        currency,
        quantity,
        details
      };
      cart.push(newItem);
      $('#cart-body').append(buildCartRow(newItem));
    }

    recalcTotals();

    // AJAX POST → /api/v1/cart/items
    sendToApi($form.data('ajax-endpoint'), 'POST', {
      product_id:   productId,
      product_type: productType,
      product_name: productName,
      unit_price:   unitPrice,
      currency:     currency,
      quantity:     quantity,
      details:      details
    });

    showFeedback($form, '"' + productName + '" added to your cart!', 'success');

    // Reset the quantity spinner and any extra selects
    $form.find('[name="quantity"]').val(1);
    $form.find('select[required]').val('');
  });


  /* UPDATE QUANTITY IN CART */

  $(document).on('submit', '#cart-body form[data-ajax-method="PATCH"]', function (e) {
    e.preventDefault();
    const $form      = $(this);
    const $row       = $form.closest('tr');
    const cartItemId = $form.find('[name="cart_item_id"]').val();
    const productId  = $form.find('[name="product_id"]').val();
    const newQty     = parseInt($form.find('[name="quantity"]').val(), 10);

    if (isNaN(newQty) || newQty < 1) {
      showFeedback($form, 'Quantity must be at least 1.', 'error');
      return;
    }

    // Update state
    const item = cart.find(function (i) { return i.cartItemId === cartItemId; });
    if (item) {
      item.quantity = newQty;
      $row.find('[data-line-total-display]').text(fmt(item.unitPrice * newQty));
    }

    recalcTotals();

    // AJAX PATCH → /api/v1/cart/items/{id}
    sendToApi($form.data('ajax-endpoint'), 'PATCH', {
      cart_item_id: cartItemId,
      product_id:   productId,
      quantity:     newQty
    });

    showFeedback($form, 'Quantity updated.', 'success');
  });


  /* REMOVE ITEM FROM CART */

  $(document).on('submit', '#cart-body form[data-ajax-method="DELETE"]', function (e) {
    e.preventDefault();
    const $form      = $(this);
    const cartItemId = $form.find('[name="cart_item_id"]').val();
    const productId  = $form.find('[name="product_id"]').val();

    // Remove from state array
    const idx = cart.findIndex(function (i) { return i.cartItemId === cartItemId; });
    if (idx !== -1) cart.splice(idx, 1);

    // Fade row out then remove it, then recalc
    $form.closest('tr').fadeOut(250, function () {
      $(this).remove();
      recalcTotals();
    });

    // AJAX DELETE → /api/v1/cart/items/{id}
    sendToApi($form.data('ajax-endpoint'), 'DELETE', {
      cart_item_id: cartItemId,
      product_id:   productId
    });
  });


  /* CLEAR ENTIRE CART */

  $('#clear-cart-form').on('submit', function (e) {
    e.preventDefault();
    if (!confirm('Are you sure you want to clear your entire cart? This cannot be undone.')) {
      return;
    }

    cart.length = 0;
    $('#cart-body').empty();
    recalcTotals();

    // AJAX DELETE → /api/v1/cart
    sendToApi($(this).data('ajax-endpoint'), 'DELETE', {});
  });


  /* PAYMENT METHOD TOGGLE */

  $('input[name="payment_method"]').on('change', function () {
    if ($(this).val() === 'card') {
      $('#card-fields').slideDown(200);
    } else {
      $('#card-fields').slideUp(200);
    }
  });


  /* CHECKOUT FORM VALIDATION */

  $('#checkout-form').on('submit', function (e) {
    e.preventDefault();

    const errors = [];

    // 10a. Cart must have items
    if (cart.length === 0) {
      errors.push('Your cart is empty. Please add at least one item before checking out.');
    }

    // 10b. Required billing fields
    const billingFields = [
      { id: 'billing-name',    label: 'Full Name' },
      { id: 'billing-email',   label: 'Email Address' },
      { id: 'billing-address', label: 'Billing Address' },
      { id: 'billing-city',    label: 'City' },
      { id: 'billing-state',   label: 'State / Province' },
      { id: 'billing-zip',     label: 'Postal / ZIP Code' },
      { id: 'billing-country', label: 'Country' }
    ];

    billingFields.forEach(function (field) {
      if (!$('#' + field.id).val().trim()) {
        errors.push(field.label + ' is required.');
      }
    });

    // 10c. Email format
    const emailVal = $('#billing-email').val().trim();
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      errors.push('Please enter a valid email address (e.g. jane@university.edu).');
    }

    // 10d. Card-specific validation (only when card payment selected)
    if ($('#pay-card').is(':checked')) {
      const cardName   = $('#card-name').val().trim();
      const cardNum    = $('#card-number').val().replace(/\s+/g, '');
      const cardExpiry = $('#card-expiry').val().trim();
      const cardCvc    = $('#card-cvc').val().trim();

      if (!cardName) {
        errors.push('Name on Card is required.');
      }
      if (!/^\d{15,16}$/.test(cardNum)) {
        errors.push('Card Number must be 15 or 16 digits (spaces are ignored).');
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) {
        errors.push('Expiry Date must be in MM/YY format (e.g. 08/27).');
      }
      if (!/^\d{3,4}$/.test(cardCvc)) {
        errors.push('CVC must be 3 or 4 digits.');
      }
    }

    // 10e. Terms checkbox
    if (!$('#agree-purchase-terms').is(':checked')) {
      errors.push('You must agree to the Purchase Terms to place your order.');
    }

    // --- Show errors or proceed ---
    const $feedback = $('#order-feedback');

    if (errors.length > 0) {
      const errorHtml =
        '<strong>Please fix the following before placing your order:</strong><ul>' +
        errors.map(function (err) { return '<li>' + err + '</li>'; }).join('') +
        '</ul>';
      $feedback
        .html(errorHtml)
        .css({
          color:        '#f87171',
          border:       '1px solid #f87171',
          padding:      '12px',
          borderRadius: '6px',
          marginTop:    '12px'
        })
        .show();
      $('html, body').animate({ scrollTop: $feedback.offset().top - 20 }, 400);
      return;
    }

    // --- Build order JSON payload ---
    const orderPayload = {
      order_id:       'ORD-' + Date.now(),
      timestamp:      new Date().toISOString(),
      billing: {
        name:    $('#billing-name').val().trim(),
        email:   $('#billing-email').val().trim(),
        address: $('#billing-address').val().trim(),
        city:    $('#billing-city').val().trim(),
        state:   $('#billing-state').val().trim(),
        zip:     $('#billing-zip').val().trim(),
        country: $('#billing-country').val()
      },
      delivery_preference: $('input[name="delivery_preference"]:checked').val(),
      payment_method:      $('input[name="payment_method"]:checked').val(),
      receipt_email:       $('#receipt-email').is(':checked'),
      currency:            'USD',
      cart_items:          JSON.parse(JSON.stringify(cart)),   // deep clone
      subtotal:            parseFloat($('#checkout-subtotal').val()),
      tax:                 parseFloat($('#checkout-tax').val()),
      order_total:         parseFloat($('#checkout-order-total').val())
    };

    console.log('=== Order Payload JSON ===');
    console.log(JSON.stringify(orderPayload, null, 2));

    // AJAX POST → /api/v1/orders
    sendToApi(
      '/api/v1/orders',
      'POST',
      orderPayload,
      function (response) {
        // Success callback (API not yet built - fires only when API is live)
        console.log('Order placed:', response);
        $feedback
          .html(
            '<strong>Order placed successfully!</strong> ' +
            'A confirmation has been sent to ' + orderPayload.billing.email + '.'
          )
          .css({
            color:        '#4ade80',
            border:       '1px solid #4ade80',
            padding:      '12px',
            borderRadius: '6px',
            marginTop:    '12px'
          })
          .show();
      },
      function () {
        // Error callback
        // The API stub logs the failure; show a user-friendly message
        $feedback
          .html(
            '<strong>Order submitted.</strong> ' +
            '(The API is not yet built - your order JSON has been logged to the console.)'
          )
          .css({
            color:        '#facc15',
            border:       '1px solid #facc15',
            padding:      '12px',
            borderRadius: '6px',
            marginTop:    '12px'
          })
          .show();
      }
    );
  });

  /* AJAX TRANSPORT STUB */

  function sendToApi(endpoint, method, payload, onSuccess, onError) {
    // Normalise to uppercase
    method = (method || 'POST').toUpperCase();

    console.log('[AJAX] ' + method + ' → ' + endpoint);
    console.log('[AJAX] Payload:', JSON.stringify(payload, null, 2));

    $.ajax({
      url:         endpoint,
      // Browsers can only send GET/POST from HTML forms;
      // override with the header so the future API can route correctly.
      method:      (method === 'GET') ? 'GET' : 'POST',
      contentType: 'application/json',
      data:        JSON.stringify(payload),
      headers: {
        'X-HTTP-Method-Override': method,
        'Accept':                 'application/json'
      },
      success: function (response) {
        console.log('[AJAX] ✅ Success from ' + endpoint + ':', response);
        if (typeof onSuccess === 'function') onSuccess(response);
      },
      error: function (xhr, status) {
        // The API is not yet built so 404/network errors are expected.
        // Log them clearly without crashing the UI.
        console.warn(
          '[AJAX] ❌ ' + method + ' ' + endpoint + ' failed ' +
          '(API not yet built - this is expected). Status: ' + status
        );
        if (typeof onError === 'function') onError(status);
      }
    });
  }


  /* INLINE FEEDBACK HELPER */

  function showFeedback($anchorEl, message, type) {
    const color = (type === 'error') ? '#f87171' : '#4ade80';

    // Reuse an existing feedback element if one is already there
    let $msg = $anchorEl.siblings('.js-feedback');
    if (!$msg.length) {
      $msg = $('<p class="js-feedback" style="margin-top:6px;font-size:0.9em;"></p>');
      $anchorEl.after($msg);
    }

    $msg.text(message).css('color', color).stop(true).show();
    setTimeout(function () { $msg.fadeOut(600); }, 3500);
  }


  /* INITIALISE */

  // Compute and display all totals from the seeded cart data
  recalcTotals();

  // Card fields are shown by default because "Credit / Debit Card"
  // is the pre-checked payment radio
  $('#card-fields').show();

});
