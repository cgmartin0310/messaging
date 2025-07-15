import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Box, Button, TextField, Table, TableBody, TableCell, TableHead, TableRow, IconButton, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Add, Edit, Delete, Description } from '@mui/icons-material';
import LoadingSpinner from '../common/LoadingSpinner';

const complianceTypes = [
  'Internal/Interagency',
  'TPO',
  'Legal/Investigative Disclosure',
  'Other Non-TPO',
  'SUD Counseling Notes'
];

const PatientManager = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPatientDialog, setShowPatientDialog] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientForm, setPatientForm] = useState({ firstName: '', lastName: '', dob: '', address: '', phone: '', email: '' });
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [documentForm, setDocumentForm] = useState({ type: '', description: '', fileUrl: '', consentDetails: {} });
  const [selectedDocumentPatientId, setSelectedDocumentPatientId] = useState(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/patients');
      setPatients(response.data);
    } catch (error) {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePatient = async () => {
    try {
      if (selectedPatient) {
        await axios.put(`/api/patients/${selectedPatient.id}`, patientForm);
      } else {
        await axios.post('/api/patients', patientForm);
      }
      toast.success('Patient saved');
      setShowPatientDialog(false);
      setSelectedPatient(null);
      fetchPatients();
    } catch (error) {
      toast.error('Failed to save patient');
    }
  };

  const handleEditPatient = (patient) => {
    setSelectedPatient(patient);
    setPatientForm(patient);
    setShowPatientDialog(true);
  };

  const handleDeletePatient = async (id) => {
    if (window.confirm('Delete patient?')) {
      try {
        await axios.delete(`/api/patients/${id}`);
        toast.success('Patient deleted');
        fetchPatients();
      } catch (error) {
        toast.error('Failed to delete patient');
      }
    }
  };

  const handleSaveDocument = async () => {
    try {
      await axios.post(`/api/patients/${selectedDocumentPatientId}/documents`, documentForm);
      toast.success('Document saved');
      setShowDocumentDialog(false);
      fetchPatients();
    } catch (error) {
      toast.error('Failed to save document');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Manage Patients</Typography>
      <Button variant="contained" startIcon={<Add />} onClick={() => setShowPatientDialog(true)} sx={{ mb: 2 }}>Add Patient</Button>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>DOB</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {patients.map(patient => (
            <TableRow key={patient.id}>
              <TableCell>{patient.firstName} {patient.lastName}</TableCell>
              <TableCell>{patient.dob}</TableCell>
              <TableCell>{patient.phone}</TableCell>
              <TableCell>{patient.email}</TableCell>
              <TableCell>
                <IconButton onClick={() => handleEditPatient(patient)}><Edit /></IconButton>
                <IconButton onClick={() => handleDeletePatient(patient.id)}><Delete /></IconButton>
                <IconButton onClick={() => { setSelectedDocumentPatientId(patient.id); setShowDocumentDialog(true); }}><Add /></IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Patient Dialog */}
      <Dialog open={showPatientDialog} onClose={() => setShowPatientDialog(false)}>
        <DialogTitle>{selectedPatient ? 'Edit Patient' : 'Add Patient'}</DialogTitle>
        <DialogContent>
          <TextField label="First Name" value={patientForm.firstName} onChange={e => setPatientForm({ ...patientForm, firstName: e.target.value })} fullWidth sx={{ mb: 2 }} />
          <TextField label="Last Name" value={patientForm.lastName} onChange={e => setPatientForm({ ...patientForm, lastName: e.target.value })} fullWidth sx={{ mb: 2 }} />
          <TextField label="DOB" type="date" value={patientForm.dob} onChange={e => setPatientForm({ ...patientForm, dob: e.target.value })} fullWidth sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} />
          <TextField label="Address" value={patientForm.address} onChange={e => setPatientForm({ ...patientForm, address: e.target.value })} fullWidth sx={{ mb: 2 }} />
          <TextField label="Phone" value={patientForm.phone} onChange={e => setPatientForm({ ...patientForm, phone: e.target.value })} fullWidth sx={{ mb: 2 }} />
          <TextField label="Email" value={patientForm.email} onChange={e => setPatientForm({ ...patientForm, email: e.target.value })} fullWidth sx={{ mb: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPatientDialog(false)}>Cancel</Button>
          <Button onClick={handleSavePatient} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Document Dialog */}
      <Dialog open={showDocumentDialog} onClose={() => setShowDocumentDialog(false)}>
        <DialogTitle>Add Document</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Type</InputLabel>
            <Select value={documentForm.type} onChange={e => setDocumentForm({ ...documentForm, type: e.target.value })}>
              {complianceTypes.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Description" value={documentForm.description} onChange={e => setDocumentForm({ ...documentForm, description: e.target.value })} fullWidth sx={{ mb: 2 }} />
          <TextField label="File URL" value={documentForm.fileUrl} onChange={e => setDocumentForm({ ...documentForm, fileUrl: e.target.value })} fullWidth sx={{ mb: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDocumentDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveDocument} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientManager; 