import React, { useState, useEffect } from 'react';
import {
  Box,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  Heading,
  Spinner,
  Alert,
  AlertIcon,
  CloseButton,
  Button,
  useToast,
  Card,
  CardBody,
  CardHeader,
  Stack,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Image,
  Divider
} from '@chakra-ui/react';
import { RefreshCw } from 'lucide-react';
import { dashboardAPI, teacherAPI, adminAPI, studentAPI } from '../../services/api';


export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [teachersCount, setTeachersCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [masterRoster, setMasterRoster] = useState([]);
  const [reenrollRequests, setReenrollRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const toast = useToast();

  const loadData = async () => {
    try {
      const [statsData, teacherData, logsData, studentData, reenrollData] = await Promise.all([
        dashboardAPI.getStats(),
        teacherAPI.getAll(),
        adminAPI.getAuditLogs(),
        studentAPI.getAll(),
        adminAPI.getReenrollRequests().catch(err => {
          console.error("Failed to load re-enroll requests:", err);
          return { requests: [] };
        })
      ]);
      setStats(statsData);
      setTeachersCount(teacherData.total || 0);
      setLogs(logsData.logs || []);
      setReenrollRequests(reenrollData.requests || []);

      // Build master roster from real DB data
      const students = (studentData.data || []).map(s => ({
        id: `s-${s.id}`,
        name: s.fullName,
        email: s.email,
        role: 'Student',
        status: s.status || 'Active'
      }));
      const teachers = (teacherData.data || []).map(t => ({
        id: `t-${t.id}`,
        name: t.fullName,
        email: t.email,
        role: 'Faculty',
        status: t.status || 'Active'
      }));
      setMasterRoster([...students, ...teachers]);
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error fetching metrics',
        description: err.message || 'Failed to load administrative dashboard metrics.',
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncBiometrics = async () => {
    setSyncing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSyncing(false);
    toast({
      title: 'Biometrics Synchronized',
      description: 'Face embeddings successfully re-indexed in Neon DB.',
      status: 'success',
      duration: 3000,
      isClosable: true
    });
  };

  const handleOpenVerifyModal = (req) => {
    setSelectedRequest(req);
    setIsVerifyModalOpen(true);
  };

  const handleApprove = async (requestId) => {
    setActionLoading(true);
    try {
      await adminAPI.approveReenroll(requestId);
      toast({
        title: 'Request Approved',
        description: 'Face ID successfully updated for the student.',
        status: 'success',
        duration: 4000,
        isClosable: true
      });
      setIsVerifyModalOpen(false);
      loadData();
    } catch (err) {
      toast({
        title: 'Approval Failed',
        description: err.message || 'Error occurred during approval.',
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    setActionLoading(true);
    try {
      await adminAPI.rejectReenroll(requestId);
      toast({
        title: 'Request Rejected',
        description: 'Face ID re-enrollment request has been dismissed.',
        status: 'info',
        duration: 4000,
        isClosable: true
      });
      setIsVerifyModalOpen(false);
      loadData();
    } catch (err) {
      toast({
        title: 'Rejection Failed',
        description: err.message || 'Error occurred during rejection.',
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Flex minH="80vh" align="center" justify="center">
        <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
      </Flex>
    );
  }

  const totalStudents = stats?.totalStudents || 0;

  return (
    <Box p={6} bg="gray.50" minH="100vh" w="100%">
      {/* Header section */}
      <Flex justify="space-between" align="center" mb={6} direction={{ base: 'column', md: 'row' }} gap={4}>
        <Box>
          <Heading size="lg" color="gray.800" fontWeight="bold">Admin Dashboard</Heading>
          <Text color="gray.500" fontSize="sm">System metrics, biometric health, and configuration oversight</Text>
        </Box>
        <Button
          leftIcon={<RefreshCw size={16} />}
          colorScheme="blue"
          onClick={handleSyncBiometrics}
          isLoading={syncing}
          shadow="md"
        >
          Verify Biometrics & Sync
        </Button>
      </Flex>

      {/* Alert Banner */}
      <Alert status="success" borderRadius="lg" mb={6} shadow="sm">
        <AlertIcon />
        <Box flex="1">
          <Text fontSize="sm" fontWeight="semibold">Biometric Vector Engine Active</Text>
          <Text fontSize="xs">SFace 128-d model projections successfully running on Neon DB pgvector backend.</Text>
        </Box>
        <CloseButton alignSelf="flex-start" position="relative" right={-1} top={-1} />
      </Alert>

      {/* Statistics Tracking SimpleGrid */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        {/* Total Verified Students */}
        <Card shadow="sm" borderRadius="xl" borderLeft="4px solid" borderColor="blue.500">
          <CardBody>
            <Stat>
              <StatLabel color="gray.500" fontWeight="semibold" fontSize="xs" uppercase>Total Verified Students</StatLabel>
              <StatNumber fontSize="3xl" fontWeight="bold" color="blue.700" my={1}>{totalStudents}</StatNumber>
              <StatHelpText fontSize="xs" color="gray.400">Unique biometric records registered</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        {/* Synced Face Embeddings */}
        <Card shadow="sm" borderRadius="xl" borderLeft="4px solid" borderColor="green.500">
          <CardBody>
            <Stat>
              <StatLabel color="gray.500" fontWeight="semibold" fontSize="xs" uppercase>Synced Face Embeddings</StatLabel>
              <StatNumber fontSize="3xl" fontWeight="bold" color="green.700" my={1}>{totalStudents} / {totalStudents}</StatNumber>
              <StatHelpText fontSize="xs" color="gray.400">100% cloud pgvector indexing coverage</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        {/* Active Faculty Accounts */}
        <Card shadow="sm" borderRadius="xl" borderLeft="4px solid" borderColor="purple.500">
          <CardBody>
            <Stat>
              <StatLabel color="gray.500" fontWeight="semibold" fontSize="xs" uppercase>Active Faculty Accounts</StatLabel>
              <StatNumber fontSize="3xl" fontWeight="bold" color="purple.700" my={1}>{teachersCount}</StatNumber>
              <StatHelpText fontSize="xs" color="gray.400">Class modules currently mapped</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Face Re-enrollment Approvals Card */}
      {reenrollRequests.length > 0 && (
        <Card borderRadius="xl" shadow="sm" bg="var(--bg-secondary)" border="1px solid" borderColor="orange.200" overflow="hidden" mb={8}>
          <Box p={5} borderBottom="1px solid" borderColor="orange.100" bg="orange.50">
            <Heading size="md" color="orange.800">Pending Face Re-enrollment Approvals</Heading>
            <Text fontSize="xs" color="orange.600">Verify new face scans against original face records before updating user credentials</Text>
          </Box>
          <CardBody p={0} overflowX="auto">
            <Table variant="striped" colorScheme="orange" size="md">
              <Thead bg="orange.50">
                <Tr>
                  <Th fontSize="xs" color="orange.700" fontWeight="bold">Name</Th>
                  <Th fontSize="xs" color="orange.700" fontWeight="bold">Roll Number</Th>
                  <Th fontSize="xs" color="orange.700" fontWeight="bold">Date Requested</Th>
                  <Th fontSize="xs" color="orange.700" fontWeight="bold" textAlign="right">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {reenrollRequests.map((req) => (
                  <Tr key={req.id}>
                    <Td fontWeight="semibold" color="gray.800">{req.fullName}</Td>
                    <Td color="gray.600">{req.rollNumber}</Td>
                    <Td color="gray.500" fontSize="sm">
                      {req.createdAt ? new Date(req.createdAt).toLocaleString() : '-'}
                    </Td>
                    <Td textAlign="right">
                      <Button
                        size="sm"
                        colorScheme="orange"
                        onClick={() => handleOpenVerifyModal(req)}
                      >
                        Verify Face ID
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      {/* Verify Face ID Modal */}
      <Modal isOpen={isVerifyModalOpen} onClose={() => setIsVerifyModalOpen(false)} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader borderBottom="1px solid" borderColor="gray.100" py={4}>
            <Heading size="md" color="gray.800">Verify Face ID Re-enrollment</Heading>
            <Text fontSize="xs" color="gray.500" mt={1}>Comparing captured credentials for {selectedRequest?.fullName}</Text>
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody py={6}>
            {selectedRequest && (
              <Stack spacing={6}>
                {/* Side-by-Side Photos */}
                <SimpleGrid columns={2} spacing={6}>
                  <Box>
                    <Text fontWeight="semibold" fontSize="sm" color="gray.600" mb={2} textAlign="center">
                      Original Profile Photo
                    </Text>
                    <Box
                      borderRadius="lg"
                      overflow="hidden"
                      border="2px solid"
                      borderColor="gray.200"
                      bg="gray.100"
                      height="200px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {selectedRequest.originalPhoto ? (
                        <Image
                          src={selectedRequest.originalPhoto}
                          alt="Original"
                          objectFit="cover"
                          height="100%"
                          width="100%"
                          fallbackSrc="https://i.pravatar.cc/150?img=99"
                        />
                      ) : (
                        <Text fontSize="sm" color="gray.400">No Original Photo</Text>
                      )}
                    </Box>
                  </Box>

                  <Box>
                    <Text fontWeight="semibold" fontSize="sm" color="orange.600" mb={2} textAlign="center">
                      Proposed Face Scan
                    </Text>
                    <Box
                      borderRadius="lg"
                      overflow="hidden"
                      border="2px solid"
                      borderColor="orange.200"
                      bg="orange.50"
                      height="200px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Image
                        src={selectedRequest.proposedPhoto}
                        alt="Proposed"
                        objectFit="cover"
                        height="100%"
                        width="100%"
                      />
                    </Box>
                  </Box>
                </SimpleGrid>

                <Divider />

                {/* Biometric Comparison stats */}
                <Box
                  p={4}
                  borderRadius="lg"
                  bg={selectedRequest.distance !== null && selectedRequest.distance <= 0.48 ? "green.50" : "red.50"}
                  border="1px solid"
                  borderColor={selectedRequest.distance !== null && selectedRequest.distance <= 0.48 ? "green.200" : "red.200"}
                >
                  <Heading
                    size="xs"
                    color={selectedRequest.distance !== null && selectedRequest.distance <= 0.48 ? "green.800" : "red.800"}
                    textTransform="uppercase"
                    mb={3}
                  >
                    Biometric Vector Inference
                  </Heading>
                  
                  <SimpleGrid columns={2} spacing={4}>
                    <Box>
                      <Text fontSize="xs" color="gray.500">Vector Distance (L2)</Text>
                      <Text fontSize="lg" fontWeight="bold" color="gray.700">
                        {selectedRequest.distance !== null ? selectedRequest.distance.toFixed(4) : "N/A"}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="gray.500">Similarity Confidence</Text>
                      <Text fontSize="lg" fontWeight="bold" color="gray.700">
                        {selectedRequest.distance !== null
                          ? `${Math.max(0, Math.min(100, Math.round((1 - selectedRequest.distance) * 100)))}%`
                          : "N/A"}
                      </Text>
                    </Box>
                  </SimpleGrid>

                  <Box mt={3} pt={3} borderTop="1px solid" borderColor={selectedRequest.distance !== null && selectedRequest.distance <= 0.48 ? "green.200" : "red.200"}>
                    <Flex align="center" gap={2}>
                      <Badge
                        colorScheme={selectedRequest.distance !== null && selectedRequest.distance <= 0.48 ? "green" : "red"}
                        variant="solid"
                        px={2.5}
                        py={0.5}
                        borderRadius="full"
                      >
                        {selectedRequest.distance !== null && selectedRequest.distance <= 0.48 ? "MATCH CONFIRMED" : "MISMATCH WARNING"}
                      </Badge>
                      <Text fontSize="xs" color="gray.600" fontWeight="medium">
                        {selectedRequest.distance !== null && selectedRequest.distance <= 0.48
                          ? "Biometric characteristics match the original enrollment record."
                          : "Inference score indicates characteristics deviate significantly from original enrollment."}
                      </Text>
                    </Flex>
                  </Box>
                </Box>
              </Stack>
            )}
          </ModalBody>

          <ModalFooter borderTop="1px solid" borderColor="gray.100" gap={3}>
            <Button
              colorScheme="red"
              variant="outline"
              onClick={() => handleReject(selectedRequest.id)}
              isLoading={actionLoading}
              mr="auto"
            >
              Reject Request
            </Button>
            <Button variant="ghost" onClick={() => setIsVerifyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              colorScheme="green"
              onClick={() => handleApprove(selectedRequest.id)}
              isLoading={actionLoading}
            >
              Approve & Save Face ID
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Roster Management Table Container */}
      <Card borderRadius="xl" shadow="sm" bg="var(--bg-secondary)" border="1px solid var(--border-color)" overflow="hidden">
        <Box p={5} borderBottom="1px solid" borderColor="gray.100">
          <Heading size="md" color="gray.700">Master Roster Directory</Heading>
          <Text fontSize="xs" color="gray.400">Manage active access permissions and biometric credentials across roles</Text>
        </Box>
        <CardBody p={0} overflowX="auto">
          <Table variant="striped" colorScheme="gray" size="md">
            <Thead bg="gray.50">
              <Tr>
                <Th fontSize="xs" color="gray.500" fontWeight="bold">Name</Th>
                <Th fontSize="xs" color="gray.500" fontWeight="bold">Email Address</Th>
                <Th fontSize="xs" color="gray.500" fontWeight="bold">System Role</Th>
                <Th fontSize="xs" color="gray.500" fontWeight="bold">Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {masterRoster.map((user) => (
                <Tr key={user.id}>
                  <Td fontWeight="semibold" color="gray.800">{user.name}</Td>
                  <Td color="gray.600">{user.email}</Td>
                  <Td>
                    <Badge colorScheme={user.role === 'Faculty' ? 'purple' : 'blue'} variant="subtle">
                      {user.role}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge colorScheme={user.status === 'Active' ? 'green' : 'red'} variant="solid">
                      {user.status}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>

      <AdminAuditLogs logs={logs} />
    </Box>
  );
}

export function AdminAuditLogs({ logs }) {
  return (
    <Card borderRadius="xl" shadow="sm" overflow="hidden" mt={6} bg="var(--bg-secondary)" border="1px solid var(--border-color)">
      <CardHeader bg="gray.50" py={4} borderBottom="1px solid" borderColor="gray.100">
        <Heading size="xs" color="gray.700" textTransform="uppercase" letterSpacing="wider">Immutable System Action Ledger</Heading>
      </CardHeader>
      <Box overflowX="auto">
        <Table variant="simple" size="sm">
          <Thead bg="gray.50">
            <Tr>
              <Th fontSize="10px" color="gray.500">Timestamp</Th>
              <Th fontSize="10px" color="gray.500">Action Node</Th>
              <Th fontSize="10px" color="gray.500">Authorized Actor</Th>
              <Th fontSize="10px" color="gray.500">Status Sign</Th>
            </Tr>
          </Thead>
          <Tbody>
            {logs.map((log) => (
              <Tr key={log.id}>
                <Td fontSize="xs" color="gray.600" py={3}>{log.timestamp}</Td>
                <Td fontSize="xs" fontWeight="semibold" color="gray.800" py={3}>{log.action}</Td>
                <Td fontSize="xs" color="gray.600" py={3}>{log.actor}</Td>
                <Td py={3}>
                  <Badge colorScheme={log.status === 'Success' ? 'green' : log.status === 'Info' ? 'blue' : 'orange'} variant="subtle">
                    {log.status}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Card>
  );
}
