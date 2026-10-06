package com.boardgame.uno;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class UnoTable {

    private final DrawPile drawPile;
    private final DiscardPile discardPile;
    private ActiveColor activeColor;

    public UnoTable(DrawPile drawPile, DiscardPile discardPile) {
        this.drawPile = drawPile;
        this.discardPile = discardPile;
        this.activeColor = ActiveColor.of(discardPile.top());
    }

    public UnoCard top() {
        return discardPile.top();
    }

    public Optional<UnoColor> color() {
        return activeColor.value();
    }

    // R8
    public boolean accepts(UnoCard card) {
        return card.matches(top(), activeColor.color());
    }

    public void discard(UnoCard card, UnoColor color) {
        discardPile.place(card);
        activeColor = new ActiveColor(color);
    }

    public void paint(UnoColor color) {
        activeColor = new ActiveColor(color);
    }

    // R14: 여러 장을 뽑는 도중 비어도 그 자리에서 다시 만들고 이어 뽑는다. 모자라면 있는 만큼만.
    public List<UnoCard> draw(int count, EventBatch events) {
        List<UnoCard> drawn = new ArrayList<>();
        while (drawn.size() < count && refillIfEmpty(events)) {
            drawn.add(drawPile.take());
        }
        return drawn;
    }

    private boolean refillIfEmpty(EventBatch events) {
        if (!drawPile.isEmpty()) {
            return true;
        }
        List<UnoCard> recycled = discardPile.takeAllButTop();
        if (recycled.isEmpty()) {
            return false;
        }
        drawPile.refill(recycled);
        events.add(UnoEvent.reshuffle(drawPile.size()));
        return true;
    }

    public void bury(List<UnoCard> cards) {
        drawPile.putUnder(cards);
    }

    public int drawPileSize() {
        return drawPile.size();
    }

    public int discardSize() {
        return discardPile.size();
    }
}
