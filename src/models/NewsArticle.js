class NewsArticle {
    constructor({
        id,
        title,
        summary,
        content,
        url,
        source,
        topic,
        publishedAt,
        sentimentScore,
        images,
        affectedEntities
    }) {
        this.id = id;
        this.title = title;
        this.summary = summary;
        this.content = content;
        this.url = url;
        this.source = source;
        this.topic = topic;
        this.publishedAt = publishedAt;
        this.sentimentScore = sentimentScore;
        this.images = images || [];
        this.affectedEntities = affectedEntities || [];
    }
}

module.exports = NewsArticle; 