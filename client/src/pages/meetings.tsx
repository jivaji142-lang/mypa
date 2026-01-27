import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, Trash2, Calendar, Clock, MapPin, Edit2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Meeting {
  id: number;
  title: string;
  date: string;
  time: string;
  location?: string;
  description?: string;
  participants?: string;
  textToSpeak?: string;
  enabled: boolean;
}

export default function Meetings() {
  const [open, setOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const { toast } = useToast();

  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ['/api/meetings']
  });

  const createMeeting = useMutation({
    mutationFn: (data: Partial<Meeting>) => apiRequest('POST', '/api/meetings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      setOpen(false);
      toast({ title: "Meeting created successfully!" });
    }
  });

  const updateMeeting = useMutation({
    mutationFn: ({ id, ...data }: Partial<Meeting> & { id: number }) => 
      apiRequest('PATCH', `/api/meetings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      setOpen(false);
      setEditingMeeting(null);
      toast({ title: "Meeting updated successfully!" });
    }
  });

  const deleteMeeting = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/meetings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      toast({ title: "Meeting deleted" });
    }
  });

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    description: "",
    participants: "",
    textToSpeak: "",
  });

  const resetForm = () => {
    setFormData({
      title: "",
      date: "",
      time: "",
      location: "",
      description: "",
      participants: "",
      textToSpeak: "",
    });
    setEditingMeeting(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      enabled: true,
    };

    if (editingMeeting) {
      updateMeeting.mutate({ id: editingMeeting.id, ...data });
    } else {
      createMeeting.mutate(data);
    }
  };

  const openEditModal = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setFormData({
      title: meeting.title,
      date: meeting.date,
      time: meeting.time,
      location: meeting.location || "",
      description: meeting.description || "",
      participants: meeting.participants || "",
      textToSpeak: meeting.textToSpeak || "",
    });
    setOpen(true);
  };

  const formatTimeTo12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const sortedMeetings = [...meetings].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  return (
    <Layout>
      <div className="space-y-6 h-full overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#002E6E] italic">My Meetings</h1>
            <p className="text-slate-500">Schedule and manage your meetings</p>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button 
                className="rounded-xl bg-[#002E6E] hover:bg-[#002E6E]/90 text-white shadow-lg gap-2"
                data-testid="button-add-meeting"
              >
                <Plus className="w-5 h-5" /> Add Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[#002E6E] italic">
                  {editingMeeting ? "Edit Meeting" : "Schedule Meeting"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Meeting Title</Label>
                  <Input
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Team standup"
                    required
                    className="royal-input"
                    data-testid="input-meeting-title"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="royal-input"
                      data-testid="input-meeting-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                      required
                      className="royal-input"
                      data-testid="input-meeting-time"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Location (Optional)</Label>
                  <Input
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Conference Room A / Zoom link"
                    className="royal-input"
                    data-testid="input-meeting-location"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Participants (Optional)</Label>
                  <Input
                    value={formData.participants}
                    onChange={e => setFormData({ ...formData, participants: e.target.value })}
                    placeholder="John, Sarah, Mike"
                    className="royal-input"
                    data-testid="input-meeting-participants"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Meeting agenda..."
                    className="royal-input resize-none"
                    rows={2}
                    data-testid="input-meeting-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Voice Announcement (Optional)</Label>
                  <Input
                    value={formData.textToSpeak}
                    onChange={e => setFormData({ ...formData, textToSpeak: e.target.value })}
                    placeholder="You have a meeting in 5 minutes"
                    className="royal-input"
                    data-testid="input-meeting-voice"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={createMeeting.isPending || updateMeeting.isPending}
                  className="w-full h-12 text-lg rounded-xl bg-[#002E6E] hover:bg-[#002E6E]/90 text-white font-semibold shadow-lg italic"
                  data-testid="button-submit-meeting"
                >
                  {(createMeeting.isPending || updateMeeting.isPending) ? (
                    <Loader2 className="animate-spin" />
                  ) : editingMeeting ? "Update Meeting" : "Schedule Meeting"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#00BAF2]" />
          </div>
        ) : sortedMeetings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
            <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-600 mb-2">No Meetings Scheduled</h3>
            <p className="text-slate-400">Click "Add Meeting" to schedule your first meeting</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedMeetings.map((meeting) => (
              <div 
                key={meeting.id}
                className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 hover:shadow-xl transition-all"
                data-testid={`meeting-card-${meeting.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Users className="w-7 h-7 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-[#002E6E] italic truncate">{meeting.title}</h3>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(meeting.date), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTimeTo12Hour(meeting.time)}
                        </span>
                        {meeting.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {meeting.location}
                          </span>
                        )}
                      </div>
                      {meeting.participants && (
                        <p className="text-sm text-slate-400 mt-1">
                          With: {meeting.participants}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(meeting)}
                      className="text-slate-400 hover:text-[#002E6E]"
                      data-testid={`button-edit-meeting-${meeting.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMeeting.mutate(meeting.id)}
                      disabled={deleteMeeting.isPending}
                      className="text-slate-400 hover:text-red-500"
                      data-testid={`button-delete-meeting-${meeting.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
