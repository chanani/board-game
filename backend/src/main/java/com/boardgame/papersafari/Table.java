package com.boardgame.papersafari;

import java.util.List;
import java.util.Optional;

public class Table {

    private final Deck deck;
    private final DiscardPile discardPile;
    private final CardShuffler shuffler;

    private Table(Deck deck, DiscardPile discardPile, CardShuffler shuffler) {
        this.deck = deck;
        this.discardPile = discardPile;
        this.shuffler = shuffler;
    }

    public static Table setUp(CardShuffler shuffler) {
        Deck deck = Deck.of(shuffler.shuffle(StandardDeck.cards()));
        return new Table(deck, new DiscardPile(), shuffler);
    }

    public List<Card> dealHand() {
        return deck.drawMany(Board.SIZE);
    }

    public void openDiscard() {
        discardPile.place(deck.draw());
    }

    public Card drawFromDeck() {
        refillIfEmpty();
        return deck.draw();
    }

    public Card drawFromDiscard() {
        return discardPile.takeTop();
    }

    public void discard(Card card) {
        discardPile.place(card);
    }

    public int deckSize() {
        return deck.size();
    }

    public Optional<Card> discardTop() {
        return discardPile.top();
    }

    private void refillIfEmpty() {
        if (!deck.isEmpty()) {
            return;
        }
        deck.refill(shuffler.shuffle(discardPile.takeAllButTop()));
    }
}
