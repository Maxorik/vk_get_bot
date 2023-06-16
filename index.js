import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { Telegraf } = require('telegraf');
const axios = require("axios");

import config from './config.js';

const bot = new Telegraf(config.tg_token);
const intervalMs = 10800000;  // отправляем картинки раз в 3 часа

let lastImageId = null;

async function run() {
    // блок с первым постингом
    const vkPostUrl = `https://api.vk.com/method/wall.get?owner_id=-${config.vk_app}&count=2&access_token=${config.vk_service_key}&v=${config.vk_ver}`;
    axios.get(vkPostUrl)
        .then(response => {
            try {
                const imageId = response.data.response.items[0].id;

                // не отправляем одинаковые посты
                if(imageId !== lastImageId) { 
                    lastImageId = imageId;

                    const imageList = response.data.response.items[0].attachments; 

                    // обрезаем лишние теги картинки
                    const imageTags = response.data.response.items[0].text.match(/#[^\s]+/g);
                    const imageTagsParsed = imageTags.map(hashtag => hashtag.replace(/@\S+/, '')).map(hashtag => hashtag.replace(/#[а-яА-Я]+/, ''));
                    const imageTagsString = imageTagsParsed.join(' ');
                    // конец блока

                    const photoList = [];

                    // если картинок несколько в посте, отправляем все одним сообщением
                    imageList.forEach(image => {
                        const imageSizes = image.photo.sizes; 
                        const imageUrl = imageSizes[imageSizes.length - 1];
                        photoList.push({
                            type: 'photo',
                            media: imageUrl
                        });
                    });

                    // добавляем описание
                    photoList[0].caption = imageTagsString;

                    bot.telegram.sendMediaGroup(config.tg_group_cherry, photoList);
                }
            }
            catch(e) {
                console.log(e);
            }
        })
        .catch(error => {
            console.log(error)
        });

        // TODO // блок со вторым постингом
        // ..............................

    setTimeout(run, intervalMs);
};

run();