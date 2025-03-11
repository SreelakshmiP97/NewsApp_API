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
        sentimentLabel,
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
        this.sentimentLabel = sentimentLabel || this.getSentimentLabel(sentimentScore);
        this.images = images || [];
        this.affectedEntities = affectedEntities || [];
    }

    getSentimentLabel(score) {
        if (score < 0.3) return 'Very Negative';
        if (score < 0.45) return 'Negative';
        if (score < 0.55) return 'Neutral';
        if (score < 0.7) return 'Positive';
        return 'Very Positive';
    }
}

module.exports = NewsArticle; 