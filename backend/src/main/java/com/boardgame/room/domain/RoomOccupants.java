package com.boardgame.room.domain;

import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.member.domain.Avatar;
import java.util.ArrayList;
import java.util.List;

public class RoomOccupants {

    private final RoomMembers players;
    private final Spectators spectators;

    private RoomOccupants(RoomMembers players, Spectators spectators) {
        this.players = players;
        this.spectators = spectators;
    }

    public static RoomOccupants hostedBy(Participant host, Capacity capacity) {
        RoomOccupants occupants = new RoomOccupants(new RoomMembers(), new Spectators());
        occupants.addPlayer(host, capacity);
        return occupants;
    }

    public void addPlayer(Participant participant, Capacity capacity) {
        players.add(participant, capacity);
        spectators.remove(participant.memberId());
    }

    public void addSpectator(Participant participant) {
        spectators.add(participant);
    }

    public void seat(long memberId, Capacity capacity) {
        Participant spectator = spectators.require(memberId);
        addPlayer(spectator, capacity);
    }

    public void setReady(long memberId, boolean ready) {
        players.requireMember(memberId);
        players.setReady(memberId, ready);
    }

    public boolean everyGuestReady() {
        return players.everyGuestReady();
    }

    public void clearReady() {
        players.clearReady();
    }

    public List<Long> readyIds() {
        return players.readyIds();
    }

    /** 비어 있는 자리만큼 관전자를 들어온 순서대로 참가자로 옮긴다. */
    public void seatWaitingSpectators(Capacity capacity) {
        int vacancies = capacity.value() - players.size();
        spectators.takeFirst(Math.max(vacancies, 0))
                .forEach(spectator -> players.add(spectator, capacity));
    }

    public void requireSpectator(long memberId) {
        spectators.require(memberId);
    }

    public void removePlayer(long memberId) {
        players.remove(memberId);
    }

    public void removeSpectator(long memberId) {
        spectators.remove(memberId);
    }

    public boolean isPlayer(long memberId) {
        return players.contains(memberId);
    }

    public boolean isSpectator(long memberId) {
        return spectators.contains(memberId);
    }

    public boolean isOccupant(long memberId) {
        return isPlayer(memberId) || isSpectator(memberId);
    }

    public void requirePlayer(long memberId) {
        players.requireMember(memberId);
    }

    public boolean isHost(long memberId) {
        return players.isHost(memberId);
    }

    public long hostId() {
        return players.hostId();
    }

    public boolean hasNoPlayers() {
        return players.isEmpty();
    }

    public int playerCount() {
        return players.size();
    }

    public int spectatorCount() {
        return spectators.size();
    }

    public List<Long> playerIds() {
        return players.ids();
    }

    public List<Long> occupantIds() {
        return together(players.ids(), spectators.ids());
    }

    public List<Participant> players() {
        return players.asList();
    }

    public List<Participant> spectators() {
        return spectators.asList();
    }

    public Participant addBot(BotDifficulty difficulty, Avatar avatar, Capacity capacity) {
        return players.addBot(difficulty, avatar, capacity);
    }

    public void changeBot(long botId, BotDifficulty difficulty) {
        players.changeBot(botId, difficulty);
    }

    // R13: 사람 참가자가 한 명도 없으면 컴퓨터·관전자가 남아도 빈 방이다.
    public boolean hasNoHumanPlayers() {
        return !players.hasHumans();
    }

    public boolean hasBots() {
        return !players.bots().isEmpty();
    }

    public List<Participant> bots() {
        return players.bots();
    }

    public boolean isBot(long memberId) {
        return players.isBot(memberId);
    }

    public Participant host() {
        return players.host();
    }

    public List<Long> humanPlayerIds() {
        return players.humanIds();
    }

    public List<Long> humanOccupantIds() {
        return together(players.humanIds(), spectators.ids());
    }

    private static List<Long> together(List<Long> first, List<Long> second) {
        List<Long> all = new ArrayList<>(first);
        all.addAll(second);
        return List.copyOf(all);
    }
}
