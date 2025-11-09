import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Award, Star, Trophy, ShieldCheck, Zap, Clock, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const badgeIcons = {
    taskmaster: <Star className="w-6 h-6 text-yellow-400"/>,
    punctual_performer: <Clock className="w-6 h-6 text-blue-400"/>,
    team_player: <Users className="w-6 h-6 text-green-400"/>,
    top_performer: <Trophy className="w-6 h-6 text-amber-500" />
};

export default function GamificationDashboard({ users, badges }) {
    const leaderboard = useMemo(() => {
        const safeUsers = Array.isArray(users) ? users : [];
        return [...safeUsers]
            .sort((a, b) => (b.performance_points || 0) - (a.performance_points || 0))
            .slice(0, 10);
    }, [users]);
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Trophy className="text-yellow-500"/> Leaderboard</CardTitle>
                        <CardDescription>Top 10 performers based on points.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <ul className="space-y-3">
                           {leaderboard.length > 0 ? leaderboard.map((user, index) => (
                               <li key={user.id} className={`p-3 rounded-lg flex items-center justify-between transition-all ${index < 3 ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'bg-muted/50'}`}>
                                   <div className="flex items-center gap-4">
                                       <span className="font-bold text-lg w-6 text-center">{index + 1}</span>
                                       <Avatar>
                                           <AvatarImage src={user.profile_picture_url} />
                                           <AvatarFallback>{user.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                       </Avatar>
                                       <div>
                                           <p className="font-semibold">{user.full_name || 'Unknown'}</p>
                                           <p className="text-xs text-muted-foreground">{user.designation || ''}</p>
                                       </div>
                                   </div>
                                   <div className="text-right">
                                        <p className="font-bold text-lg text-yellow-600">{user.performance_points || 0} pts</p>
                                   </div>
                               </li>
                           )) : (
                               <p className="text-muted-foreground text-center">No performance data available yet.</p>
                           )}
                       </ul>
                    </CardContent>
                </Card>
            </div>
             <div>
                <Card>
                    <CardHeader>
                       <CardTitle className="flex items-center gap-2"><Award className="text-indigo-500"/> My Badges</CardTitle>
                       <CardDescription>Your collection of achievements.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4">
                       {/* This would be dynamically rendered based on logged in user's badges */}
                       <div className="flex flex-col items-center text-center p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                           <ShieldCheck className="w-10 h-10 text-green-500"/>
                           <p className="text-xs font-semibold mt-1">Task Master</p>
                       </div>
                       <div className="flex flex-col items-center text-center p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                           <Zap className="w-10 h-10 text-orange-500"/>
                           <p className="text-xs font-semibold mt-1">Punctual Performer</p>
                       </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}