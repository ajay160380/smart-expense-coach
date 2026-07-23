import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import api from '../api/config';

const NotepadScreen = ({ navigation }) => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newNote, setNewNote] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            setLoading(true);
            const response = await api.get('/notes/');
            setNotes(response.data.notes || []);
        } catch (error) {
            console.error('Error fetching notes:', error);
            Alert.alert('Error', 'Failed to load notes');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNote = async () => {
        if (!newNote.trim()) {
            Alert.alert('Error', 'Note cannot be empty');
            return;
        }

        try {
            setSaving(true);
            const response = await api.post('/notes/', {
                text: newNote
            });

            if (response.data.status === 'success') {
                setNewNote('');
                fetchNotes(); // Reload notes
            } else {
                Alert.alert('Error', response.data.error || 'Failed to save note');
            }
        } catch (error) {
            console.error('Error saving note:', error);
            Alert.alert('Error', 'Failed to save note');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteNote = async (id) => {
        Alert.alert(
            "Delete Note",
            "Are you sure you want to delete this note?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await api.delete(`/notes/${id}/delete/`);
                            if (response.data.status === 'success') {
                                setNotes(prev => prev.filter(n => n.id !== id));
                            } else {
                                Alert.alert('Error', response.data.error || 'Failed to delete note');
                            }
                        } catch (error) {
                            console.error('Error deleting note:', error);
                            Alert.alert('Error', 'Failed to delete note');
                        }
                    }
                }
            ]
        );
    };

    const renderNote = ({ item }) => (
        <View style={styles.noteCard}>
            <Text style={styles.noteText}>{item.text}</Text>
            <View style={styles.noteFooter}>
                <Text style={styles.noteDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                <TouchableOpacity onPress={() => handleDeleteNote(item.id)} style={styles.deleteButton}>
                    <Icon name="trash-2" size={16} color="#FF3B30" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notepad</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Write a new note..."
                    multiline
                    value={newNote}
                    onChangeText={setNewNote}
                />
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveNote} disabled={saving}>
                    {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveButtonText}>Save</Text>}
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : notes.length === 0 ? (
                <View style={styles.center}>
                    <Icon name="file-text" size={48} color="#CCC" style={{ marginBottom: 16 }} />
                    <Text style={styles.emptyText}>No notes yet.</Text>
                    <Text style={styles.emptySubtext}>Save important info or shopping lists here!</Text>
                </View>
            ) : (
                <FlatList
                    data={notes}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderNote}
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    inputContainer: {
        padding: 16,
        backgroundColor: '#FFF',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    input: {
        backgroundColor: '#F2F2F7',
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 12,
    },
    saveButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    listContainer: {
        padding: 16,
    },
    noteCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    noteText: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
        marginBottom: 12,
    },
    noteFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
    },
    noteDate: {
        fontSize: 12,
        color: '#8E8E93',
    },
    deleteButton: {
        padding: 4,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
    },
});

export default NotepadScreen;
