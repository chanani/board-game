package com.boardgame.oldmaid;

// R1~R3: 카드 한 장. 조커는 무늬가 없다(suit = null).
public record PlayingCard(CardId id, Suit suit, Rank rank) {

    private static final int RANKS_PER_SUIT = 13;
    private static final int JOKER_ID = 52;

    public static PlayingCard of(Suit suit, Rank rank) {
        return new PlayingCard(new CardId(suit.ordinal() * RANKS_PER_SUIT + rank.ordinal()), suit, rank);
    }

    public static PlayingCard joker() {
        return new PlayingCard(new CardId(JOKER_ID), null, Rank.JOKER);
    }

    public boolean isJoker() {
        return rank.isJoker();
    }

    // R3: 랭크가 같으면 무늬·색과 상관없이 짝. 조커와 자기 자신은 짝이 아니다.
    public boolean pairsWith(PlayingCard other) {
        return !isJoker() && rank == other.rank && !id.equals(other.id);
    }
}
