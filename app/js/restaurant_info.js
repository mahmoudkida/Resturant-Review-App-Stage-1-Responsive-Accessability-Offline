let restaurant, map;

document.addEventListener('DOMContentLoaded', (event) => {

     
    
    fetchRestaurantFromURL((error, restaurant) => {
        if (error) { // Got an error!
            console.error(error);
        } else {
            fillBreadcrumb();
        }
    });
});


/**
 * Initialize Google map, called from HTML.
 */

const initMap = () => {
    if (!self.map) {
        self.map = new google.maps.Map(document.getElementById('map'), {
            zoom: 16,
            center: restaurant.latlng,
            scrollwheel: false
        });
    }
    document.getElementById("map-container").classList.add("show-interactive-map");

    DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
}

const initStaticMap = () => {
    let latlng = `${restaurant.latlng.lat},${restaurant.latlng.lng}`,
        zoom = 12,
        imageConrtainer = document.getElementById("map-container");
    let size = imageConrtainer.offsetWidth + "x" + imageConrtainer.offsetHeight;
    let staticMapURL = `https://maps.googleapis.com/maps/api/staticmap?center=${latlng}&zoom=${zoom}&size=${size}&key=AIzaSyD7zwXocDxCO_YLSyVhDNYZDmhMxr0RcNU`;
    staticMapURL += `&markers=${restaurant.latlng.lat},${restaurant.latlng.lng}`;
    document.querySelector(".static-map").setAttribute("src", staticMapURL);
}

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
    if (self.restaurant) { // restaurant already fetched!
        callback(null, self.restaurant)
        return;
    }
    const id = getParameterByName('id');
    if (!id) { // no id found in URL
        let error = 'No restaurant id in URL'
        callback(error, null);
    } else {
        DBHelper.fetchRestaurantById(id, (error, restaurant) => {
            self.restaurant = restaurant;
            if (!restaurant) {
                console.error(error);
                return;
            }
            fillRestaurantHTML();
            initStaticMap();
            callback(null, restaurant);
            //init lazy loading
            setTimeout(function () {
                bLazy.revalidate();
            }, 10);
        });
    }
}
/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
    const name = document.getElementById('restaurant-name');
    name.innerHTML = restaurant.name;

    //create favorite button
    const addTofavoriteButton = document.createElement("button");
    addTofavoriteButton.classList.add("add-tofavorite");
    if (restaurant.is_favorite == "true" || restaurant.is_favorite == true) {
        addTofavoriteButton.classList.add("favorite");
        addTofavoriteButton.innerHTML = '<span>★</span> Favorited';
        addTofavoriteButton.title = "Click to remove from favorite";
    } else {
        addTofavoriteButton.innerHTML = '<span>☆</span> Add To Favorite';
    }
    addTofavoriteButton.setAttribute("role", "button");
    addTofavoriteButton.setAttribute("onclick", "addRestaurantToFavorite(this)");
    addTofavoriteButton.dataset.restaurantId = restaurant.id;
    name.append(addTofavoriteButton);



    const address = document.getElementById('restaurant-address');
    address.innerHTML = restaurant.address;

    const image = document.getElementById('restaurant-img');
    image.className = 'restaurant-img b-lazy';
    //image.src = DBHelper.imageUrlForRestaurant(restaurant);
    image.src = "/img/placeholder-image.jpg";
    image.setAttribute("data-src", `${DBHelper.imageUrlForRestaurant(restaurant)}`);
    image.setAttribute("data-srcset", `/img/${restaurant.id}_300.jpg 300w,/img/${restaurant.id}.jpg 586w,/img/${restaurant.id}_800.jpg 800w`);

    //    image.setAttribute("data-src-small",`img/${restaurant.id}_300.jpg`);
    //    image.setAttribute("data-src-medium",`img/${restaurant.id}_580.jpg`);
    //    image.setAttribute("data-src-large",`img/${restaurant.id}_800.jpg`);
    image.setAttribute("alt", `${restaurant.name}Restaurant Main Image, `);

    const cuisine = document.getElementById('restaurant-cuisine');
    cuisine.innerHTML = restaurant.cuisine_type;

    // fill operating hours
    if (restaurant.operating_hours) {
        fillRestaurantHoursHTML();
    }
    // fill reviews
    DBHelper.fetchRestaurantReview(restaurant.id, (error, reviews) => {
        if (error) return alert(error);
        self.restaurant.reviews = reviews;
        fillReviewsHTML();
    })

}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
    const hours = document.getElementById('restaurant-hours');
    for (let key in operatingHours) {
        const row = document.createElement('tr');

        const day = document.createElement('th');
        day.setAttribute("role", "rowheader");
        day.innerHTML = key;
        row.appendChild(day);

        const time = document.createElement('td');
        time.innerHTML = operatingHours[key];
        row.appendChild(time);

        hours.appendChild(row);
    }
}


/**
 * Add - Remove retaurant to favorite.
 */
const addRestaurantToFavorite = (btn) => {
    DBHelper.toggleRestaurantFavorite(btn.dataset['restaurantId'], function (error, response) {
        if (error) alert(error);
        if (response.is_favorite == "false") {
            btn.classList.remove("favorite");
            btn.innerHTML = '<span>☆</span> Add To Favorite';
        } else {
            btn.innerHTML = '<span>★</span> Favorited';
            btn.title = "Click to remove from favorite";
            btn.classList.add("favorite");
        }
    });
}

/**
 * Add review to a restaurant
 */
const submitRetaurantReview = (evt, restaurant = self.restaurant) => {
    //reset the error container
    document.getElementById("form-error-list").innerHTML = "";
    let reviewForm = document.getElementsByName("restaurant-review-form")[0],
        reviewBody = {};
    //check if there is any missing text
    if (reviewForm.elements["user_name"].value == "") {
        document.getElementById("form-error-list").append(document.createElement("li").innerHTML("Please fill your name"))
        return false;
    }
    if (reviewForm.elements["rating"].value == "") {
        document.getElementById("form-error-list").append(document.createElement("li").innerHTML("Please fill the rating"))
        return false;
    }
    if (reviewForm.elements["comments"].value == "") {
        document.getElementById("form-error-list").append(document.createElement("li").innerHTML("Please fill your comment"))
        return false;
    }
    reviewBody = {
        restaurant_id: restaurant.id,
        name: reviewForm.elements["user_name"].value,
        rating: reviewForm.elements["rating"].value,
        comments: reviewForm.elements["comments"].value,
        date: new Date()
    };

    DBHelper.postRestaurantReview(reviewBody, function (error, response) {
        if (error) return alert(error);
        if (!self.restaurant.reviews) {
            self.restaurant.reviews = [];
        }
        self.restaurant.reviews.unshift(reviewBody);
        fillReviewsHTML();
        reviewForm.reset();
    })
    return true;
}
/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = self.restaurant.reviews) => {
    const container = document.getElementById('reviews-container');
    container.innerHTML = '';
    const title = document.createElement('h3');
    title.innerHTML = 'Reviews';
    container.appendChild(title);

    if (!reviews) {
        const noReviews = document.createElement('p');
        noReviews.innerHTML = 'No reviews yet!';
        container.appendChild(noReviews);
        return;
    }
    const ul = document.createElement('ul');
    ul.setAttribute("id", "reviews-list");
    ul.setAttribute("role", "list");
    reviews.forEach(review => {
        ul.appendChild(createReviewHTML(review));
    });

    container.appendChild(ul);

}

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
    const li = document.createElement('li');
    li.setAttribute("role", "listitem")

    const name = document.createElement('h3');
    name.innerHTML = review.name;
    li.appendChild(name);

    if (review.createdAt) {
        const date = document.createElement('date');
        date.innerHTML = timeConverter(review.createdAt);
        date.setAttribute("datetime", review.date)
        li.appendChild(date);
    }


    const rating = document.createElement('p');
    rating.setAttribute("title", "1 to 5 rating");
    rating.innerHTML = `Rating: ${review.rating}`;
    li.appendChild(rating);

    const comments = document.createElement('p');
    comments.innerHTML = review.comments;
    li.appendChild(comments);

    return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant = self.restaurant) => {
    const breadcrumb = document.getElementById('breadcrumb');
    const li = document.createElement('li');
    li.innerHTML = restaurant.name;
    li.setAttribute("aria-current", "page");
    breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
    if (!url)
        url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
        results = regex.exec(url);
    if (!results)
        return null;
    if (!results[2])
        return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}



const timeConverter = (UNIX_timestamp) => {
    var a = new Date(UNIX_timestamp * 1000);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var year = a.getYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = date + ' ' + month + ' ' + hour + ':' + min + ':' + sec;
    return time;
}
const bLazy = new Blazy({
    // Options
});
