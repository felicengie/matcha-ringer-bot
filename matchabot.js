// This file contains the vendor list, while bot.js seperate the list

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const fs = require('fs').promises;
const { ChannelType } = require('discord.js');
require('dotenv').config();

class MatchaBot {
    constructor(token) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });
        
        this.token = token;
        this.vendors = {
            'marukyu-koyamaen': {
                name: 'Marukyu Koyamaen',
                baseUrl: 'https://www.marukyu-koyamaen.co.jp',
                products: [
                    { name: 'Chigi no Shira', url: '/english/shop/products/1181040c1' },
                    { name: 'Isuzu', url: '/english/shop/products/1191040c1' },
                    { name: 'Kinrin', url: '/english/shop/products/1151020c1' },
                    { name: 'Aorashi', url: '/english/shop/products/11a1040c1' },
                    { name: 'Wakatake', url: '/english/shop/products/11b1100c1' },
                    { name: 'Wako', url: '/english/shop/products/1161020c1' }
                ]
            },
            'ippodo-global': {
                name: 'Ippodo Global',
                baseUrl: 'https://global.ippodo-tea.co.jp',
                products: [
                    { name: 'Ikuyo‑no‑mukashi 30 g', url: '/collections/matcha/products/matcha105033' },
                    { name: 'Ikuyo‑no‑mukashi 100 g', url: '/collections/matcha/products/matcha175512'},
                    { name: 'Uji-Shimizu 400 g Bag', url: '/products/matcha642402' },
                    { name: 'Kan‑no‑shiro 30 g Box', url: '/collections/matcha/products/matcha104033' },
                    { name: 'Ummon‑no‑mukashi 40 g Can', url: '/products/matcha101044' },
                    { name: 'Sayaka‑no‑mukashi 40 g Can', url: '/products/matcha103644' },
                    { name: 'Sayaka‑no‑mukashi 100 g Bag', url: '/collections/matcha/products/matcha173512' }
                ]
                },
            'ippodo-us': {
                name: 'Ippodo US',
                baseUrl: 'https://ippodotea.com',
                products: [
                    { name: 'Sayaka-no-mukashi', url: '/products/sayaka-no-mukashi' },
                    { name: 'Sayaka-no-mukashi 100g', url: '/collections/matcha/products/sayaka-100g' },
                    { name: 'Ikuyo-no-mukashi', url: '/products/ikuyo' },
                    { name: 'Ikuyo-no-mukashi 100g', url: '/products/ikuyo-100' },
                    { name: 'mi no mukasi 20g', url: '/products/new-years-matcha' },
                    { name: 'nodoka spring', url: '/products/nodoka-special-spring-matcha' },
                    { name: 'Ummon-no-mukashi', url: '/products/ummon-no-mukashi-40g' }
                ]
            },
            'yugen-tea': {
                name: 'Yugen Tea',
                baseUrl: 'https://yugentea.com',
                products: [
                    { name: 'Premium Matcha', url: '/products/premium-matcha' },
                    { name: 'Ceremonial Matcha', url: '/products/ceremonial-matcha' }
                ]
            },
            'mizuba-tea': {
                name: 'Mizuba Tea Co',
                baseUrl: 'https://mizubatea.com',
                products: [
                    { name: 'Daily Matcha', url: '/products/daily-matcha' }
                ]
            },
            'rocky-matcha': {
                name: "Rocky's Matcha",
                baseUrl: 'https://rockysmatcha.com',
                products: [
                    { name: 'Ceremonial Blend 20g', url: '/products/rockys-matcha-ceremonial-blend-matcha-20g' },
                    { name: 'Ceremonial Blend 100g', url: '/products/rockys-matcha-ceremonial-blend-matcha-100g' },
                    { name: 'Tsujiki Ceremonial Blend 20g', url: '/products/rockys-matcha-tsujiki-blend-matcha-20g' },
                    { name: 'Osada Ceremonial Blend 20g', url: '/products/rockys-matcha-osada-ceremonial-blend-matcha-20g' }
                ]
            },
            'sazen-tea': {
                name: 'Sazen Tea',
                baseUrl: 'https://www.sazentea.com',
                products: [
                    { name: 'Marukyu Kinrin', url: '/en/products/p1394-marukyu-koyamaen-kinrin-matcha' },
                    { name: 'Marukyu Wakatake', url: '/en/products/p1393-marukyu-koyamaen-wakatake-matcha' }
                ]
            }
        };
        
        this.stockData = new Map();
        this.userRoles = new Map();
        this.init();
    }

    async init() {
        await this.loadStockData();
        await this.setupEventHandlers();
        await this.client.login(this.token);
    }

    async loadStockData() {
        try {
            const data = await fs.readFile('stock_data.json', 'utf8');
            const stockArray = JSON.parse(data);
            this.stockData = new Map(stockArray);
        } catch (error) {
            console.log('No existing stock data found, starting fresh');
            this.stockData = new Map();
        }
    }

    async saveStockData() {
        const stockArray = Array.from(this.stockData.entries());
        await fs.writeFile('stock_data.json', JSON.stringify(stockArray, null, 2));
    }

    setupEventHandlers() {
        if (this._eventHandlersSetup) return;
        this._eventHandlersSetup = true;

        this.client.once('clientReady', () => {
            console.log(`🍵 Matcha Bot is online as ${this.client.user.tag}!`);
            this.setupChannels();
            this.startMonitoring();
            this.client.on('messageCreate', this.handleMessageCreate.bind(this));
        });

        this.client.on('interactionCreate', async (interaction) => {
            try {
                if (interaction.isButton()) {
                    await this.handleRoleToggle(interaction);
                }
            } catch (error) {
                console.error('Error handling interaction:', error);
                if (!interaction.replied && !interaction.deferred) {
                    try {
                        await interaction.reply({
                            content: '❌ An error occurred. Please check bot permissions.',
                            ephemeral: true
                        });
                    } catch (err) {
                        console.error('Failed to send error reply:', err.message);
                    }
                    return;
                }
            }
        });
    }

    async handleMessageCreate(message) {
        if (message.author.bot) return;
        
        try {
            if (message.content === '!matcha-setup') {
                console.log('📝 Received !matcha-setup command');
                await this.sendRoleSelector(message.channel);
            }
            
            if (message.content === '!matcha-status') {
                console.log('📊 Received !matcha-status command');
                await this.sendStatusUpdate(message.channel);
            }

            if (message.content === '!matcha-test') {
                console.log('🧪 Received !matcha-test command');
                await message.reply('🍵 Bot is working! Try `!matcha-setup` to get started.');
            }

            if (message.content === '!matcha-check-now') {
                console.log('🔍 Manual stock check requested');
                await message.reply('🔍 Checking stocks now... This may take a moment.');
                
                let checkedCount = 0;
                let stockReport = '📊 **Stock Check Results:**\n\n';
                
                for (const [vendorKey, vendor] of Object.entries(this.vendors)) {
                    stockReport += `**${vendor.name}:**\n`;
                    for (const product of vendor.products) {
                        const stockInfo = await this.checkStock(vendor, product);
                        checkedCount++;
                        const status = stockInfo.inStock ? '🟢 In Stock' : '🔴 Out of Stock';
                        const priceInfo = stockInfo.price !== 'Check website' ? ` - ${stockInfo.price}` : '';
                        stockReport += `• ${product.name}: ${status}${priceInfo}\n`;
                        
                        console.log(`${status} - ${vendor.name} - ${product.name}: ${stockInfo.price}`);
                    }
                    stockReport += '\n';
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between vendors
                }
                
                // Split message if too long
                if (stockReport.length > 2000) {
                    const chunks = stockReport.match(/[\s\S]{1,1900}/g);
                    for (const chunk of chunks) {
                        await message.channel.send(chunk);
                    }
                } else {
                    await message.channel.send(stockReport);
                }
            }

            if (message.content.startsWith('!matcha-test-url ')) {
                const url = message.content.replace('!matcha-test-url ', '').trim();
                console.log(`🧪 Testing specific URL: ${url}`);
                
                try {
                    const response = await axios.get(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                        },
                        timeout: 15000
                    });
                    
                    const $ = cheerio.load(response.data);
                    
                    // Find potential stock indicators
                    const buttons = $('button, input[type="submit"]').map((i, el) => $(el).text().trim()).get();
                    const stockElements = $('.stock, .availability, .sold-out, .out-of-stock, .unavailable').map((i, el) => $(el).text().trim()).get();
                    const priceElements = $('.price, .cost, .money').map((i, el) => $(el).text().trim()).get();
                    
                    let debugInfo = `**🔍 URL Analysis: ${url}**\n\n`;
                    debugInfo += `**Buttons found:** ${buttons.length > 0 ? buttons.join(', ') : 'None'}\n`;
                    debugInfo += `**Stock elements:** ${stockElements.length > 0 ? stockElements.join(', ') : 'None'}\n`;
                    debugInfo += `**Price elements:** ${priceElements.length > 0 ? priceElements.join(', ') : 'None'}\n`;
                    debugInfo += `**Page title:** ${$('title').text()}\n`;
                    
                    await message.reply(debugInfo);
                } catch (error) {
                    await message.reply(`❌ Error testing URL: ${error.message}`);
                }
            }

            if (message.content === '!matcha-simulate-alert') {
                console.log('🎭 Simulating alert for testing');
                const testVendor = this.vendors['marukyu-koyamaen'];
                const testProduct = testVendor.products[0];
                const testStockInfo = { inStock: true, price: '¥1,720', url: 'https://example.com' };
                
                await this.sendStockAlert('marukyu-koyamaen', testVendor, testProduct, testStockInfo);
                await message.reply('🎭 Test alert sent! Check the vendor channels.');
            }

            if (message.content === '!matcha-subs') {
                console.log('Triggered !matcha-subs command');
                const member = message.member;
                const guild = message.guild;
                const subscribed = [];

                for (const vendorKey in this.vendors) {
                    const vendor = this.vendors[vendorKey];
                    const role = guild.roles.cache.find(r => r.name === `${vendor.name} Alerts`);
                    if (role && member.roles.cache.has(role.id)) {
                        subscribed.push(vendor.name);
                    }
                }

                if (subscribed.length === 0) {
                    await message.reply('You are not subscribed to any vendor alerts.');
                } else {
                    await message.reply(`You are subscribed to: ${subscribed.join(', ')}`);
                }
            }
            
            if (message.content === '!help') {
                const helpText = [
                    '**🍵 Matcha Bot Commands:**',
                    '`!help` — Show this help message',
                    '`!matcha-setup` — Show vendor subscription buttons',
                    '`!matcha-status` — Show monitoring status',
                    '`!matcha-test` — Test if the bot is working',
                    '`!matcha-check-now` — Manually check all vendor stocks',
                    '`!matcha-test-url <url>` — Test a specific product URL for stock info',
                    '`!matcha-simulate-alert` — Simulate a restock alert (for testing)',
                    '`!matcha-subs` — Show which vendors you are subscribed to'
                ].join('\n');
                await message.reply(helpText);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            try {
                await message.reply('❌ An error occurred. Please check bot permissions.');
            } catch (replyError) {
                console.error('Could not send error reply:', replyError);
            }
        }
    }

    async setupChannels() {
        const guild = this.client.guilds.cache.first();
        if (!guild) {
            console.log('❌ No guild found');
            return;
        }

        console.log(`🏠 Setting up channels for guild: ${guild.name}`);

        // Find the "Matcha Vendors" category
        let matchaCategory = guild.channels.cache.find(
            ch => ch.name.toLowerCase() === 'matcha vendors' && ch.type === ChannelType.GuildCategory
        );

        // If category doesn't exist, create it
        if (!matchaCategory) {
            console.log('📂 Creating "Matcha Vendors" category');
            try {
                matchaCategory = await guild.channels.create({
                    name: 'Matcha Vendors',
                    type: ChannelType.GuildCategory,
                    reason: 'Category for matcha vendor monitoring channels'
                });
                console.log('✅ Created "Matcha Vendors" category');
            } catch (error) {
                console.error('❌ Error creating category:', error.message);
                return;
            }
        } else {
            console.log('📂 Found existing "Matcha Vendors" category');
        }

        // Iterate through vendors
        for (const [vendorKey, vendor] of Object.entries(this.vendors)) {
            try {
                // Vendor channel format
                const channelName = `🪴│${vendorKey}`;

                // Check if the channel already exists
                let channel = guild.channels.cache.find(ch => ch.name === channelName);

                if (!channel) {
                    console.log(`📺 Creating channel: ${channelName}`);
                    channel = await guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        parent: matchaCategory.id, // Put channel under the category
                        topic: `🍵 ${vendor.name} restock alerts`
                    });
                    console.log(`✅ Created channel: ${channelName} under Matcha Vendors category`);
                } else {
                    console.log(`📺 Channel already exists: ${channelName}`);
                    
                    // If channel exists but isn't in the category, move it
                    if (channel.parentId !== matchaCategory.id) {
                        console.log(`📁 Moving ${channelName} to Matcha Vendors category`);
                        await channel.setParent(matchaCategory.id, { lockPermissions: false });
                        console.log(`✅ Moved ${channelName} to category`);
                    }
                }

                // Create role for this vendor if it doesn't exist
                const roleName = `${vendor.name} Alerts`;
                let role = guild.roles.cache.find(r => r.name === roleName);
                if (!role) {
                    console.log(`🏷️ Creating role: ${roleName}`);
                    role = await guild.roles.create({
                        name: roleName,
                        color: 0x90EE90,
                        reason: 'Matcha restock alert role'
                    });
                    console.log(`✅ Created role: ${roleName}`);
                } else {
                    console.log(`🏷️ Role already exists: ${roleName}`);
                }

            } catch (error) {
                if (error.code === 50013) {
                    console.log(`❌ Missing permissions for ${vendor.name}. Please give the bot Administrator role or Manage Channels + Manage Roles permissions.`);
                } else {
                    console.error(`❌ Error setting up ${vendor.name}:`, error.message);
                }
            }
        }

        console.log('✅ Channel and role setup completed');
    }

    async sendRoleSelector(channel) {
        const embed = new EmbedBuilder()
            .setTitle('🍵 Matcha Restock Alerts')
            .setDescription('Click the buttons below to subscribe to restock alerts from your favorite matcha vendors!')
            .setColor(0x90EE90)
            .addFields(
                { name: '📱 How it works', value: 'Select vendors to get pinged when their matcha comes back in stock' },
                { name: '🔔 Alert Format', value: 'Product name, price, stock status, and direct link' },
                { name: '⏰ Monitoring', value: 'We check every 5 minutes for restocks' }
            );

        const buttons = [];
        const vendors = Object.entries(this.vendors);
        
        // Create rows of 5 buttons each
        for (let i = 0; i < vendors.length; i += 5) {
            const row = new ActionRowBuilder();
            
            for (let j = i; j < Math.min(i + 5, vendors.length); j++) {
                const [vendorKey, vendor] = vendors[j];
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`toggle_${vendorKey}`)
                        .setLabel(vendor.name)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🍵')
                );
            }
            buttons.push(row);
        }

        await channel.send({ embeds: [embed], components: buttons });
    }

    async handleRoleToggle(interaction) {
        const vendorKey = interaction.customId.replace('toggle_', '');
        const vendor = this.vendors[vendorKey];
        const member = interaction.member;
        const guild = interaction.guild;

        if (!vendor) return;
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }

        // Find or create role
        let role = guild.roles.cache.find(r => r.name === `${vendor.name} Alerts`);
        if (!role) {
            role = await guild.roles.create({
                name: `${vendor.name} Alerts`,
                color: 0x90EE90,
                reason: 'Matcha restock alert role'
            });
        }

        const isSubscribed = member.roles.cache.has(role.id);
        const action = isSubscribed ? 'Unsubscribed' : 'Subscribed';

        if (isSubscribed) {
            await member.roles.remove(role);
        } else {
            await member.roles.add(role);

            // Only create channel when user subscribes
            const channelName = `🪴│${vendorKey}`;
            let channel = guild.channels.cache.find(ch => ch.name === channelName);
            if (!channel) {
                // Find or create category
                let matchaCategory = guild.channels.cache.find(
                    ch => ch.name.toLowerCase() === 'matcha vendors' && ch.type === ChannelType.GuildCategory
                );
                if (!matchaCategory) {
                    matchaCategory = await guild.channels.create({
                        name: 'Matcha Vendors',
                        type: ChannelType.GuildCategory,
                        reason: 'Category for matcha vendor monitoring channels'
                    });
                }
                channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: matchaCategory.id,
                    topic: `🍵 ${vendor.name} restock alerts`
                });
            }
        }

        const message = isSubscribed
            ? `🔕 Unsubscribed from **${vendor.name}** alerts`
            : `🔔 Subscribed to **${vendor.name}** alerts!`;

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: message, ephemeral: true });
        } else {
            await interaction.followUp({ content: message, ephemeral: true });
        }
    }

    async checkStock(vendor, product) {
        try {
            const url = vendor.baseUrl + product.url;
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            return this.checkStockByVendor(vendor.name, $, url);
        } catch (error) {
            console.error(`Error checking ${vendor.name} - ${product.name}:`, error.message);
            return { inStock: false, price: 'Error', url: vendor.baseUrl + product.url };
        }
    }

        checkStockByVendor(vendorName, $, url) {
        let inStock = false;
        let price = 'Check website';

        switch (vendorName) {
            case 'Ippodo US':
                // Shopify-based site
                const addToCartButton = $('button[name="add"], button[type="submit"], .btn-product-form, input[value*="Add"]');
                const soldOutText = $('body').text().toLowerCase();
                const soldOutElements = $('.sold-out, .unavailable, .out-of-stock');
                const priceElement = $('.price, .money, [class*="price"]');
                
                inStock = addToCartButton.length > 0 &&
                        !addToCartButton.prop('disabled') &&
                        soldOutElements.length === 0 &&
                        !soldOutText.includes('sold out') &&
                        !soldOutText.includes('out of stock') &&
                        !soldOutText.includes('unavailable');
                
                if (priceElement.length) {
                    price = priceElement.first().text().trim();
                }
                break;

            case 'Ippodo Global':
                // Check for Add to bag vs Sold Out
                const globalAddButton = $('button[type="submit"], .add-to-cart, input[value*="Add"]');
                const globalSoldOut = $('.sold-out, .out-of-stock, [class*="unavailable"]');
                const globalPrice = $('.price, .amount, [class*="price"]');
                
                inStock = globalAddButton.length > 0 && 
                         globalSoldOut.length === 0 &&
                         !$('*').text().toLowerCase().includes('out of stock');
                
                if (globalPrice.length) {
                    price = globalPrice.first().text().trim();
                }
                break;

            case 'Marukyu Koyamaen':
                // Japanese site structure
                const jpButton = $('input[type="submit"], .cart-button, button[name*="add"]');
                const jpOutOfStock = $('.sold-out, .out-of-stock');
                const jpPrice = $('.price, .cost, [class*="price"], [class*="cost"]');
                
                inStock = jpButton.length > 0 && 
                         jpOutOfStock.length === 0 &&
                         !$('*').text().includes('完売') && // Japanese for "sold out"
                         !$('*').text().includes('品切れ') && // Japanese for "out of stock"
                         !$('*').text().includes('在庫切れ') && // Japanese for "out of stock"
                         !pageText.toLowerCase().includes('out of stock');
                
                if (jpPrice.length) {
                    price = jpPrice.first().text().trim();
                }
                break;

            case 'Sazen Tea':
                // E-commerce site
                const sazenButton = $('button[name="add"], .add-to-cart-btn, input[value*="Add"]');
                const sazenUnavailable = $('.unavailable, .sold-out, .out-of-stock');
                const sazenPrice = $('.price, .regular-price, [class*="price"]');
                
                inStock = sazenButton.length > 0 && 
                         !sazenButton.prop('disabled') &&
                         sazenUnavailable.length === 0;
                
                if (sazenPrice.length) {
                    price = sazenPrice.first().text().trim();
                }
                break;

            case 'Mizuba Tea Co':
                // Shopify store
                const mizubaButton = $('button[name="add"], .btn[type="submit"], input[name="add"]');
                const mizubaSoldOut = $('.sold-out, .unavailable');
                const mizubaPrice = $('.price, .money, [data-price]');
                
                inStock = mizubaButton.length > 0 && 
                         !mizubaButton.prop('disabled') &&
                         mizubaSoldOut.length === 0 &&
                         !$('*').text().toLowerCase().includes('sold out');
                
                if (mizubaPrice.length) {
                    price = mizubaPrice.first().text().trim();
                }
                break;

            case "Rocky's Matcha":
                // Check for stock availability
                const rockyButton = $('button[name="add"], .add-to-cart, input[value*="Add"]');
                const rockyOutOfStock = $('.out-of-stock, .sold-out, .unavailable');
                const rockyPrice = $('.price, .cost, [class*="price"]');
                
                inStock = rockyButton.length > 0 && 
                         !rockyButton.prop('disabled') &&
                         rockyOutOfStock.length === 0;
                
                if (rockyPrice.length) {
                    price = rockyPrice.first().text().trim();
                }
                break;

            case 'Yugen Tea':
                // Shopify-based
                const yugenButton = $('button[name="add"], .btn-product-form, input[type="submit"]');
                const yugenSoldOut = $('.sold-out, .unavailable, .out-of-stock');
                const yugenPrice = $('.price, .money, [class*="price"]');
                
                inStock = yugenButton.length > 0 && 
                         !yugenButton.prop('disabled') &&
                         yugenSoldOut.length === 0 &&
                         !$('*').text().toLowerCase().includes('sold out');
                
                if (yugenPrice.length) {
                    price = yugenPrice.first().text().trim();
                }
                break;

            default:
                // Generic fallback (less reliable)
                const genericButton = $('button[name="add"], .add-to-cart, input[value*="Add"], button[type="submit"]');
                const genericSoldOut = $('.sold-out, .out-of-stock, .unavailable');
                const genericPrice = $('.price, .cost, [class*="price"], [class*="cost"]');
                const bodyText = $('body').text().toLowerCase();
                
                inStock = genericButton.length > 0 && 
                         genericSoldOut.length === 0 &&
                         !bodyText.includes('sold out') &&
                         !bodyText.includes('out of stock') &&
                         !bodyText.includes('unavailable');
                
                if (genericPrice.length) {
                    price = genericPrice.first().text().trim();
                }
                break;
        }

        // Clean up price text
        price = price.replace(/\s+/g, ' ').trim();
        if (price === '') price = 'Check website';

        return { inStock, price, url };
    }

    async sendStockAlert(vendorKey, vendor, product, stockInfo) {
        const guild = this.client.guilds.cache.first();
        if (!guild) return;

        const channel = guild.channels.cache.find(ch => ch.name === vendorKey);
        const role = guild.roles.cache.find(r => r.name === `${vendor.name} Alerts`);
        
        if (!channel || !role) return;

        const embed = new EmbedBuilder()
            .setTitle(`${product.name} is back in stock!`)
            .setDescription(`🔔 ${role}`)
            .setColor(0x00ff00)
            .addFields(
                { name: '💰 Price', value: stockInfo.price, inline: true },
                { name: '📦 Stock', value: '🟢 Available', inline: true },
                { name: '📏 Size', value: 'Check Website', inline: true },
                { name: '🍵 Type', value: 'Matcha', inline: true },
                { name: '🔗 Link', value: `[View Product](${stockInfo.url})`, inline: true }
            )
            .setFooter({ 
                text: `Matcha Bell | ${new Date().toLocaleString('en-US', { 
                    timeZone: 'America/New_York',
                    year: 'numeric',
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                })} (EST)`
            })
            .setThumbnail('https://cdn.discordapp.com/emojis/1234567890123456789.png'); // Add matcha image

        await channel.send({ embeds: [embed] });
    }

    startMonitoring() {
        if (this._monitoringStarted) return; // ensure only one monitor
        this._monitoringStarted = true;

        cron.schedule('*/1 * * * *', async () => {
            console.log('🔍 Checking for restocks...');
            
            for (const [vendorKey, vendor] of Object.entries(this.vendors)) {
                for (const product of vendor.products) {
                    const productKey = `${vendorKey}_${product.name}`;
                    try {
                        const stockInfo = await this.checkStock(vendor, product);
                        const previousStock = this.stockData.get(productKey);

                        if (stockInfo.inStock && !previousStock) {
                            console.log(`🎉 ${vendor.name} - ${product.name} is back in stock!`);
                            await this.sendStockAlert(vendorKey, vendor, product, stockInfo);
                        }

                        this.stockData.set(productKey, stockInfo.inStock);
                    } catch (err) {
                        console.error(`Error checking ${vendor.name} - ${product.name}:`, err.message);
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await this.saveStockData();
        });

        console.log('📊 Stock monitoring started - checking every 1 minute');
    }

    async sendStatusUpdate(channel) {
        const embed = new EmbedBuilder()
            .setTitle('📊 Matcha Monitoring Status')
            .setColor(0x90EE90)
            .setDescription(`Monitoring ${Object.keys(this.vendors).length} vendors with ${Object.values(this.vendors).reduce((acc, v) => acc + v.products.length, 0)} products`)
            .addFields(
                { name: '⏰ Check Frequency', value: 'Every 5 minutes', inline: true },
                { name: '📱 Last Check', value: new Date().toLocaleTimeString(), inline: true },
                { name: '💾 Products Tracked', value: this.stockData.size.toString(), inline: true }
            );

        await channel.send({ embeds: [embed] });
    }

    healthCheck() {
        // Health check to monitor bot status
        console.log('🤖 Starting health check...');
        setInterval(() => {
            console.log(`🤖 Bot health check: ${new Date().toISOString()}`);
            console.log(`📊 Monitoring ${this.stockData.size} products`);
        }, 300000); // Every 5 minutes
    }
}

// Usage
const bot = new MatchaBot(process.env.DISCORD_TOKEN);

module.exports = MatchaBot;