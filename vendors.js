// vendors.js
const vendors = {
    'gion-tsujiri': {
        name: 'Gion Tsujiri',
        products: [
            { name: 'Matcha Chiyomukashi 40g', 
              suppliers: [
                { name: 'Gion Tsujiri', url: 'https://shop.giontsujiri.co.jp/products/21142' }
              ]
            },
            { name: 'Minegumo no Mukashi, 40g', 
              suppliers: [
                { name: 'Gion Tsujiri', url: 'https://shop.giontsujiri.co.jp/products/21612' }
              ]
            },
            { name: 'Tsubonaka no Mukashi', 
              suppliers: [
                { name: 'Gion Tsujiri', url: 'https://shop.giontsujiri.co.jp/products/21412' }
              ]
            }
        ]
    },
    'horii-shichimeien': {
        name: 'Horii Shichimeien',
        products: [
            { name: 'Uji Mukashi', 
              suppliers: [
                { name: 'Horii Shichimeien', url: 'https://horiishichimeien.com/en/products/matcha-ujimukashi' }
              ]
            },
            { name: 'Agata no Shiro', 
              suppliers: [
                { name: 'Horii Shichimeien', url: 'https://horiishichimeien.com/en/products/matcha-agatanoshiro' }
              ]
            },
            { name: 'Todou Mukashi', 
              suppliers: [
                { name: 'Horii Shichimeien', url: 'https://horiishichimeien.com/en/products/matcha-todounomukashi' }
              ]
            }
        ]
    },
    'ippodo-global': {
        name: 'Ippodo Global',
        products: [
            { name: 'Hatsu-mukashi 40 g',
                suppliers: [
                    { name: 'Ippodo Global', url: 'https://global.ippodo-tea.co.jp/collections/matcha/products/matcha109643' }
                ]
            },
            { name: 'Ikuyo‑no‑mukashi 30 g',
                suppliers: [
                    { name: 'Ippodo Global', url: 'https://global.ippodo-tea.co.jp/collections/matcha/products/matcha105033' }
                ]
            },
            { name: 'Ikuyo‑no‑mukashi 100 g',
                suppliers: [
                    { name: 'Ippodo Global', url: 'https://global.ippodo-tea.co.jp/collections/matcha/products/matcha175512' }
                ]
            },
            { name: 'Uji-Shimizu 400 g Bag',
                suppliers: [
                    { name: 'Ippodo Global', url: 'https://global.ippodo-tea.co.jp/products/matcha642402' }
                ]
            },
            { name: 'Kan‑no‑shiro 30 g Box',
                suppliers: [
                    { name: 'Ippodo Global', url: 'https://global.ippodo-tea.co.jp/collections/matcha/products/matcha104033' }
                ]
            },
            { name: 'Ummon‑no‑mukashi 40 g Can',
                suppliers: [
                    { name: 'Ippodo Global', url: 'https://global.ippodo-tea.co.jp/products/matcha101044' }
                ]
            },
            { name: 'Sayaka‑no‑mukashi 40 g Can',
                suppliers: [
                    { name: 'Ippodo Global', url: 'https://global.ippodo-tea.co.jp/products/matcha103644' }
                ]
            },
            { name: 'Sayaka‑no‑mukashi 100 g Bag',
                suppliers: [
                    { name: 'Ippodo Global', url: 'https://global.ippodo-tea.co.jp/collections/matcha/products/matcha173512' }
                ]
            }
        ]
    },
    'ippodo-us': {
        name: 'Ippodo US',
        products: [
            { name: 'Sayaka-no-mukashi',
              suppliers: [
                { name: 'Ippodo US', url: 'https://ippodotea.com/products/sayaka-no-mukashi' }
              ]
            },
            { name: 'Sayaka-no-mukashi 100g',
              suppliers: [
                { name: 'Ippodo US', url: 'https://ippodotea.com/collections/matcha/products/sayaka-100g' }
            ]
            },
            { name: 'Ikuyo-no-mukashi',
              suppliers: [
                { name: 'Ippodo US', url: 'https://ippodotea.com/products/ikuyo' }
              ]
            },
            { name: 'Ikuyo-no-mukashi 100g',
              suppliers: [
                { name: 'Ippodo US', url: 'https://ippodotea.com/products/ikuyo-100' }
              ]
            },
            { name: 'Kan 30gr',
              suppliers: [
                { name: 'Ippodo US', url: 'https://ippodotea.com/products/kan' }
            ]
            },
            { name: 'mi no mukasi 20g',
              suppliers: [
                { name: 'Ippodo US', url: 'https://ippodotea.com/products/new-years-matcha' }
              ]
            },
            { name: 'nodoka spring',
              suppliers: [
                { name: 'Ippodo US', url: 'https://ippodotea.com/products/nodoka-special-spring-matcha' }
              ]
            },
            { name: 'Ummon-no-mukashi',
              suppliers: [
                { name: 'Ippodo US', url: 'https://ippodotea.com/products/ummon-no-mukashi-40g' }
              ]
            },
            { name: 'Wakaki - 40g',
              suppliers: [
                { name: 'Ippodo US', url: 'https://ippodotea.com/products/wakaki-shiro' }
              ]
            }
        ]
    },
    'marukyu-koyamaen': {
        name: 'Marukyu Koyamaen',
        products: [
            { name: 'Aorashi',
                suppliers: [
                    { name: 'Marukyu Koyamaen', url: 'https://www.marukyu-koyamaen.co.jp/english/shop/products/11a1040c1' },
                    { name: 'Matcha Miyako', url: 'https://matchamiyako.com/en-us/products/aoarashi-100-g-matcha-bag' }
                ]
            },
            { name: 'Chigi no Shiro',
                suppliers: [
                    { name: 'Marukyu Koyamaen', url: 'https://www.marukyu-koyamaen.co.jp/english/shop/products/1181040c1' }
                ]
            },
            { name: 'Isuzu',
                suppliers: [
                    { name: 'Marukyu Koyamaen', url: 'https://www.marukyu-koyamaen.co.jp/english/shop/products/1191040c1' },
                    { name: 'Matcha Miyako', url: 'https://matchamiyako.com/en-us/products/isuzu-40-gr-matcha?_pos=25&_sid=61dcf26f3&_ss=r' }
                ]
            },
            { name: 'Kinrin',
                suppliers: [
                    { name: 'Marukyu Koyamaen', url: 'https://www.marukyu-koyamaen.co.jp/english/shop/products/1151020c1' }
                ]
            },
            { name: 'Midorigi',
                suppliers: [
                    { name: 'J&J Market', url: 'https://j-j-market.com/products/matcha-midorigi-from-marukyu-koyamaen-100g?srsltid=AfmBOop5yfTp8USBuursNvGqtzfVPln15FFT5HIGL0BPPGzprRTkAX7M' }
                ]
            },
            { name: 'Wakatake',
                suppliers: [
                    { name: 'Marukyu Koyamaen', url: 'https://www.marukyu-koyamaen.co.jp/english/shop/products/11b1100c1' }
                ]
            },
            { name: 'Wako',
                suppliers: [
                    { name: 'Marukyu Koyamaen', url: 'https://www.marukyu-koyamaen.co.jp/english/shop/products/1161020c1' },
                    { name: 'Matcha Miyako', url: 'https://matchamiyako.com/en-us/products/wako-40gr-matcha-teapor' },
                    { name: 'Matcha Miyako', url: 'https://matchamiyako.com/en-us/products/wako-100g' },
                    { name: 'Matcha Miyako', url: 'https://matchamiyako.com/en-us/products/wako' }
                ]
            }
        ]
    },
    'yugen-tea': {
        name: 'Yugen Tea',
        products: [
            { name: 'Matcha 1',
                suppliers: [
                    { name: 'Yugen Tea', url: 'https://www.yugen-kyoto.com/en-us/products/matcha1-yugen-original-blend' }
                ]
            },
            { name: 'Matcha 2',
                suppliers: [
                    { name: 'Yugen Tea', url: 'https://www.yugen-kyoto.com/en-us/products/matcha2-yugen-original-blend' }
                ]
            },
            { name: 'Matcha 3',
                suppliers: [
                    { name: 'Yugen Tea', url: 'https://www.yugen-kyoto.com/en-us/products/matcha3-yugen-original-blend' }
                ]
            }
        ]
    },
    'mizuba-tea': {
        name: 'Mizuba Tea Co',
        products: [
            { name: 'Daily Matcha',
                suppliers: [
                    { name: 'Mizuba Tea Co', url: 'https://mizubatea.com/products/daily-matcha' }
                ]
            }
        ]
    },
    'nakamura-tokichi': {
        name: 'Nakamura Tokichi',
        products: [
            { name: 'senun no shiro',
              suppliers: [
                { name: 'Nakamura Tokichi', url: 'https://global.tokichi.jp/products/mc3' }
            ]
            },
            { name: 'fuji no shiro',
              suppliers: [
                { name: 'Nakamura Tokichi', url: 'https://global.tokichi.jp/products/mc2' }
              ]
            },
            { name: 'Ukishima-no-Shiro',
              suppliers: [
                { name: 'Nakamura Tokichi', url: 'https://global.tokichi.jp/products/mc1' }
            ]
            },
            { name: 'Seiko-no-Mukashi 30gr',
              suppliers: [
                { name: 'Nakamura Tokichi', url: 'https://global.tokichi.jp/products/mc9' }
            ]
            },
            { name: 'Seikan-no-Shiro 30gr',
              suppliers: [
                { name: 'Nakamura Tokichi', url: 'https://global.tokichi.jp/products/mc5' }
              ]
            },
            { name: 'Sho-no-Mukash 30gr',
                suppliers: [
                    { name: 'Nakamura Tokichi', url: 'https://global.tokichi.jp/products/mc6' }
                ]
            },
            { name: 'Hiroha-no-Shiro 30gr',
              suppliers: [
                  { name: 'Nakamura Tokichi', url: 'https://global.tokichi.jp/products/mc4' }
              ]
            },
            { name: 'Yukawa-no-Shiro 30gr',
              suppliers: [
                  { name: 'Nakamura Tokichi', url: 'https://global.tokichi.jp/products/mc21' }
              ]
            }
        ]
    },
    'rocky-matcha': {
        name: "Rocky's Matcha",
        products: [
            { name: 'Ceremonial Blend 20g',
              suppliers: [
                  { name: "Rocky's Matcha", url: 'https://rockysmatcha.com/products/rockys-matcha-ceremonial-blend-matcha-20g' }
              ]
            },
            { name: 'Ceremonial Blend 100g',
              suppliers: [
                  { name: "Rocky's Matcha", url: 'https://rockysmatcha.com/products/rockys-matcha-ceremonial-blend-matcha-100g' }
              ]
            },
            { name: 'Tsujiki Ceremonial Blend 20g',
              suppliers: [
                  { name: "Rocky's Matcha", url: 'https://rockysmatcha.com/products/rockys-matcha-tsujiki-blend-matcha-20g' }
              ]
            },
            { name: 'Osada Ceremonial Blend 20g',
              suppliers: [
                  { name: "Rocky's Matcha", url: 'https://rockysmatcha.com/products/rockys-matcha-osada-ceremonial-blend-matcha-20g' }
              ]
            }
        ]
    }
};

module.exports = vendors;