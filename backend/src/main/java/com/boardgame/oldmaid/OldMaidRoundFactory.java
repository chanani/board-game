package com.boardgame.oldmaid;

import java.util.List;

// R5~R7: 섞어 나누고, 짝을 버린 뒤 카드 가진 사람이 2명 미만이면 다시 나눈다.
public class OldMaidRoundFactory {

    private final OldMaidDice dice;

    public OldMaidRoundFactory(OldMaidShuffler shuffler, SlotPicker picker) {
        this.dice = new OldMaidDice(shuffler, picker);
    }

    public OldMaidRound create(List<PlayerId> players, EventBatch batch) {
        Seats seats = new Seats(players);
        return OldMaidRound.begin(seats, playableDeal(seats), dice, batch);
    }

    private Deal playableDeal(Seats seats) {
        Deal deal = deal(seats);
        while (!deal.isPlayable()) {
            deal = deal(seats);
        }
        return deal;
    }

    private Deal deal(Seats seats) {
        PlayerId first = seats.at(dice.picker().pick(seats.size()));
        List<PlayerId> order = seats.inOrderFrom(first);
        Hands hands = Hands.dealt(order, dice.shuffler().shuffle(StandardOldMaidDeck.cards()));
        return Deal.of(first, order, hands);
    }
}
