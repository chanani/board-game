package com.boardgame.uno;

import java.util.List;
import java.util.Optional;

// 손패 + 자리 순서 + 우노 선언·잡기 창 기록.
public class UnoPlayers {

    private final Hands hands;
    private final TurnOrder order;
    private final UnoCalls calls;

    public UnoPlayers(Hands hands, TurnOrder order, UnoCalls calls) {
        this.hands = hands;
        this.order = order;
        this.calls = calls;
    }

    public PlayerId current() {
        return order.current();
    }

    public PlayerId nextOf(PlayerId player) {
        return order.nextOf(player);
    }

    public void advance(int steps) {
        order.advance(steps);
    }

    public void reverse() {
        order.reverse();
    }

    public Direction direction() {
        return order.direction();
    }

    public int size() {
        return order.size();
    }

    public List<PlayerId> seats() {
        return order.seats();
    }

    public boolean contains(PlayerId player) {
        return order.contains(player);
    }

    public UnoCard cardOf(PlayerId player, CardId card) {
        Hand hand = hands.of(player);
        return hand.find(card);
    }

    public void discardFrom(PlayerId player, CardId card) {
        Hand hand = hands.of(player);
        hand.take(card);
    }

    // R24: 카드를 받아 2장 이상이 되면 우노 선언이 풀린다.
    public void give(PlayerId player, List<UnoCard> cards) {
        Hand hand = hands.of(player);
        hand.add(cards);
        if (hand.size() > 1) {
            calls.undeclare(player);
        }
    }

    public List<UnoCard> cardsOf(PlayerId player) {
        return hands.cardsOf(player);
    }

    public int countOf(PlayerId player) {
        List<UnoCard> cards = hands.cardsOf(player);
        return cards.size();
    }

    public boolean isOut(PlayerId player) {
        Hand hand = hands.of(player);
        return hand.isEmpty();
    }

    public UnoColor mostHeldColor(PlayerId player) {
        Hand hand = hands.of(player);
        return hand.mostHeldColor();
    }

    public List<CardId> playable(PlayerId player, UnoCard top, UnoColor current) {
        Hand hand = hands.of(player);
        return hand.playable(top, current);
    }

    public UnoPoints pointsOf(PlayerId player) {
        Hand hand = hands.of(player);
        return hand.points();
    }

    public UnoPoints pointsExcept(PlayerId winner) {
        return hands.pointsExcept(winner);
    }

    // R35: 손패를 빼고, 자리에서 빼고(차례였으면 다음 사람으로), 우노 기록을 지운다.
    public Hand remove(PlayerId player) {
        Hand hand = hands.remove(player);
        order.remove(player);
        calls.forget(player);
        return hand;
    }

    public void settleUno(PlayerId player) {
        calls.settle(player, countOf(player));
    }

    public void declare(PlayerId player) {
        calls.declare(player);
    }

    public boolean isDeclared(PlayerId player) {
        return calls.isDeclared(player);
    }

    public boolean isCatchable(PlayerId player) {
        return calls.isCatchable(player);
    }

    public Optional<PlayerId> catchTarget() {
        return calls.catchTarget();
    }

    public void closeCatch() {
        calls.closeCatch();
    }
}
