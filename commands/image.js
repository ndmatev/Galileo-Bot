const axios = require('axios');

module.exports = {
  name: 'image',
  execute: async (message, args) => {
    if (!args.length) return message.reply('Please provide a search term!');

    const query = args.join(' ');
    const searchURL = `https://www.googleapis.com/customsearch/v1?q=${query}&cx=${process.env.GOOGLE_CX}&searchType=image&key=${process.env.GOOGLE_API_KEY}`;

    try {
      const response = await axios.get(searchURL);
      if (!response.data.items) return message.reply('No results found!');

      const images = response.data.items.map((item) => item.link);
      let index = 0;
      
      const embed = {
        color: 0x0099ff,
        title: `🔍 Image Search: "${query}"`,
        description: `Here are the search results for your query. Use the reactions below to navigate through them.`,
        image: { url: images[index] },
        footer: { text: `Page 1 of ${images.length} | React with ◀️ ▶️ 🔀 ❌` }
      };

      const msg = await message.channel.send({ embeds: [embed] });
      await msg.react('◀️');
      await msg.react('▶️');
      await msg.react('🔀');
      await msg.react('❌');

      const filter = (reaction, user) => user.id === message.author.id;
      const collector = msg.createReactionCollector({ filter, time: 60000 });

      collector.on('collect', (reaction) => {
        if (reaction.emoji.name === '◀️') index = (index > 0) ? index - 1 : images.length - 1;
        if (reaction.emoji.name === '▶️') index = (index < images.length - 1) ? index + 1 : 0;
        if (reaction.emoji.name === '🔀') index = Math.floor(Math.random() * images.length);
        if (reaction.emoji.name === '❌') return msg.delete();

        embed.image.url = images[index];
        embed.footer.text = `Page ${index + 1} of ${images.length} | React with ◀️ ▶️ 🔀 ❌`;
        msg.edit({ embeds: [embed] });
        reaction.users.remove(message.author.id);
      });
    } catch (error) {
      console.error(error);
      message.reply('Error fetching images. Please try again later.');
    }
  }
};