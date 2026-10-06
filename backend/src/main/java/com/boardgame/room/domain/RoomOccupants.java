package com.boardgame.room.domain;

import java.util.List;
import java.util.stream.Stream;

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
        return Stream.concat(players.ids().stream(), spectators.ids().stream()).toList();
    }

    public List<Participant> players() {
        return players.asList();
    }

    public List<Participant> spectators() {
        return spectators.asList();
    }
}
