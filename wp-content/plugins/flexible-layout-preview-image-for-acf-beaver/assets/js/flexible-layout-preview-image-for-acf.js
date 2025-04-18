const svgCloseIcon =
  '<svg width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.353478 0.353553C0.54874 0.158291 0.865323 0.158291 1.06058 0.353553L28.6377 27.9307C28.833 28.126 28.833 28.4426 28.6377 28.6378V28.6378C28.4425 28.8331 28.1259 28.8331 27.9306 28.6378L0.353478 1.06066C0.158215 0.865398 0.158216 0.548816 0.353478 0.353553V0.353553Z" fill="#000000"/><path d="M0.353553 28.6377C0.158291 28.4425 0.158291 28.1259 0.353553 27.9306L27.9307 0.353462C28.126 0.1582 28.4426 0.1582 28.6378 0.353462V0.353462C28.8331 0.548724 28.8331 0.865307 28.6378 1.06057L1.06066 28.6377C0.865398 28.833 0.548816 28.833 0.353553 28.6377V28.6377Z" fill="#000000 "/></svg>';

jQuery(document).ready(function (jQuery) {
  if (typeof acf !== "undefined") {
    var flexible_content_open = acf.getField("acf-field-flexible-content");
    flexible_content_open._open = function (e) {
      var $popup = jQuery(this.$el.children(".tmpl-popup").html());
      if ($popup.find("a").length == 1) {
        // Only one layout
        flexible_content_open.add($popup.find("a").attr("data-layout"));
        return false;
      }
      return flexible_content_open.apply(this, arguments);
    };
  }

  const closeButtonCSS = `
    .acf-fc-popup-close {
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
      width: 2.8rem;
      height: 2.8rem;
      cursor: pointer;
      z-index: 100;
      background-color: #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.35s cubic-bezier(0.785, 0.135, 0.15, 0.86);
    }
    .acf-fc-popup-close:hover {
      transform: rotate(90deg);
    }

    .acf-fc-popup-close svg {
      width: 1rem;
      transition: all 0.35s cubic-bezier(0.785, 0.135, 0.15, 0.86);
    }

    .acf-fc-popup-close:hover svg {
      transform: scale(1.1);
    }

  `;

  jQuery("<style>").text(closeButtonCSS).appendTo("head");

  // Add keydown event listener for ESC key
  jQuery(document).on("keydown", function (e) {
    // Check if key pressed is ESC (key code 27)
    if (e.keyCode === 27) {
      // Check if the popup is visible
      if (jQuery(".acf-fc-popup").is(":visible")) {
        // Hide the popup
        jQuery(".acf-fc-popup").hide();
        return false;
      }
    }
  });
});

jQuery("body").on("click", 'a[data-name="add-layout"]', function () {
  setTimeout(function () {
    jQuery(".acf-fc-popup a").each(function () {
      var html =
        '<div class="acf-fc-popup-label">' +
        jQuery(this).text() +
        '</div><div class="acf-fc-popup-image"></div>';
      jQuery(this).html(html);
    });

    if (jQuery(".acf-fc-popup-close").length === 0) {
      const $closeButton = jQuery(
        '<div class="acf-fc-popup-close">' + svgCloseIcon + "</div>"
      );

      $closeButton.on("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        jQuery(".acf-fc-popup").hide();

        return false;
      });

      jQuery(".acf-fc-popup").append($closeButton);
    }
  }, 0);
});
