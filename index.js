import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { Telegraf } = require('telegraf');
const axios = require("axios");

import config from './config.js';

const bot = new Telegraf(config.tg_token);
const intervalMs = 3600000;  // 1 час

const apiTypes = {
    cherry: {
        url: `https://api.vk.com/method/wall.get?owner_id=-${config.vk_app_cherry}&count=2&access_token=${config.vk_service_key}&v=${config.vk_ver}`,
        lastId: null
    },

    geek: {
        url: `https://api.vk.com/method/wall.get?owner_id=-${config.vk_app_geek}&count=2&access_token=${config.vk_service_key}&v=${config.vk_ver}`,
        lastId: null
    },

    asian: {
        url: `https://api.vk.com/method/wall.get?owner_id=-${config.vk_app_asian}&count=2&access_token=${config.vk_service_key}&v=${config.vk_ver}`,
        lastId: null
    }
};

// резервный контент на случай простоя 
const reservContent = [];

async function run() {
    let isPost = false; // постили ли контент в этот интервал

    for (let key in apiTypes) {
        const post = await axios.get(apiTypes[key].url).then(response => {
            const imageId = response.data.response.items[0].id;

            // если пост еще не был ранее опубликован, получаем его содержимое
            if(imageId !== apiTypes[key].lastId) {
                const payload = getContent(response);
                apiTypes[key].lastId = imageId;

                // если в этот интервал публикация уже была, запоминаем контент, чтобы выслать его в случае простоя
                if (isPost) {
                    if (reservContent.length < 20) {
                        const isReserved = reservContent.find(item => item[0].media === payload[0].media);
                        !isReserved && reservContent.push(payload);
                    };
                } 

                // публикуем, если контент уникальный
                else {
                    isPost = true;
                    bot.telegram.sendMediaGroup(config.tg_group_cherry, payload);
                }
            }
        });
    };

    // простой постинга - берем контент из резерва
    if (!isPost && reservContent.length > 0) {
        bot.telegram.sendMediaGroup(config.tg_group_cherry, reservContent[0]);
        reservContent.shift();
    };

    setTimeout(run, intervalMs);
};

const getContent = (response) => {
    const imageId = response.data.response.items[0].id;
    const imageList = response.data.response.items[0].attachments; 

    // обрезаем лишние теги картинки
    const imageTags = response.data.response.items[0].text.match(/#[^\s]+/g);
    const imageTagsParsed = imageTags.map(hashtag => hashtag.replace(/@\S+/, '')).map(hashtag => hashtag.replace(/#[а-яА-Я]+/, ''));
    const imageTagsString = imageTagsParsed.join(' ');

    const photoList = [];

    imageList.forEach(image => {
        const imageSizes = image.photo.sizes; 
        const imageUrl = imageSizes[imageSizes.length - 1];
        photoList.push({
            type: 'photo',
            media: imageUrl
        });
    });

    photoList[0].caption = imageTagsString;
    return photoList;
};

run();